import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Command } from "commander";
import { select } from "@clack/prompts";
import { parse as parseSVG } from "svgson";

import { addCommand } from "../commands/add";
import {
  CONFIG_FILE_NAME,
  DEFAULT_OUTPUT_PATH,
  INDEX_FILE_NAME,
  NUMBER_WORDS,
  PLATFORMS,
  REACT_INDEX_TEMPLATE,
  REACT_NATIVE_INDEX_TEMPLATE,
} from "@lib/constants";
import { AddCLIOptions, JsonConfig, Platform } from "@lib/types";

export function convertNumberToWord(name: string): string {
  if (!name) return "";

  if (/^\d/.test(name)) {
    const firstChar = name[0];
    return NUMBER_WORDS[firstChar] + name.slice(1);
  }
  return name;
}

export function toPascalCase(str: string): string {
  if (!str) return "";
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function formatSvgFileNameToPascalCase(filename: string): string {
  const baseName = path.basename(filename, ".svg");
  const nameWithWords = convertNumberToWord(baseName);
  const result = toPascalCase(nameWithWords);
  return result;
}

export async function extractSVGPath(svgContent: string): Promise<string[] | null> {
  try {
    const parsed = await parseSVG(svgContent);
    const pathElements = findAllPathElements(parsed);

    if (pathElements.length === 0) {
      return null;
    }

    return pathElements.map((element) => element.attributes.d);
  } catch (error) {
    console.error("Failed to parse SVG:", error);
    return null;
  }
}

export function findAllPathElements(node: any): any[] {
  let paths: any[] = [];

  if (node.name === "path") {
    paths.push(node);
  }

  if (node.children) {
    for (const child of node.children) {
      paths = paths.concat(findAllPathElements(child));
    }
  }

  return paths;
}

export function generateReactNativeComponent(componentName: string, pathData: string[]): string {
  const pathElements = pathData
    .map((d) => `      <Path d="${d}" fill={props.color ?? "currentColor"} />`)
    .join("\n");

  return `import React from 'react';
import { Path } from 'react-native-svg';
import { Icon, IconProps } from './index';

export const ${componentName} = React.forwardRef<any, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
${pathElements}
    </Icon>
  );
});

${componentName}.displayName = "${componentName}";
`;
}

export function generateReactComponent(componentName: string, pathData: string[]): string {
  const pathElements = pathData.map((d) => `      <path d="${d}" fill="currentColor"/>`).join("\n");

  return `import React from 'react';
import { Icon, IconProps } from './index';

export const ${componentName} = React.forwardRef<SVGSVGElement, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
${pathElements}
    </Icon>
  );
}) as React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

${componentName}.displayName = "${componentName}";
`;
}

export function getSvgFiles(): string[] {
  const svgDir = path.join(process.cwd(), "svg-icons");
  return fs
    .readdirSync(svgDir)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => path.join(svgDir, file));
}

export function searchRelatedFileNames(query: string, fileNames: string[], limit = 3): string[] {
  return fileNames
    .map((name) => ({
      name,
      score: calculateSimilarity(query, name),
    }))
    .filter((item) => item.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.name);
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s2.includes(s1) || s1.includes(s2)) return 0.8;

  const words1 = s1.split("-");
  const words2 = s2.split("-");
  const commonWords = words1.filter((w) => words2.includes(w));
  if (commonWords.length > 0)
    return 0.5 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.3;

  let matches = 0;
  const maxLength = Math.max(s1.length, s2.length);
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / maxLength;
}

export function configureAddCommand(program: Command) {
  program
    .command("add [icons...]")
    .description("Add icons to your project")
    .option("--web", `Generate ${PLATFORMS.web} components (default)`)
    .option("--native", `Generate ${PLATFORMS.native} components`)
    .action(async (icons: string[], options: AddCLIOptions) => {
      await addCommand(icons, options);
    });
}

export function readConfig(): JsonConfig | null {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    return null;
  }
}

export async function initializeConfig(): Promise<JsonConfig | null> {
  const choice = await select({
    message: "Would you like to add a config file?",
    options: [
      { value: "web", label: `Yes (${PLATFORMS.web})` },
      { value: "native", label: `Yes (${PLATFORMS.native})` },
      { value: "no", label: "No" },
    ],
  });

  if (choice === "no" || !choice) return null;

  const config: JsonConfig = {
    platform: choice as Platform,
    outputPath: DEFAULT_OUTPUT_PATH,
  };

  try {
    fs.writeFileSync(path.join(process.cwd(), CONFIG_FILE_NAME), JSON.stringify(config, null, 2));
    console.log(chalk.green("✓"), `Successfully created ${CONFIG_FILE_NAME}`);
    return config;
  } catch (error) {
    console.error(chalk.red("✖"), `Error creating ${CONFIG_FILE_NAME}:`, error);
    return null;
  }
}

export function ensureIndexFile(config: JsonConfig): void {
  const indexPath = path.join(process.cwd(), config.outputPath, INDEX_FILE_NAME);

  if (!fs.existsSync(path.dirname(indexPath))) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  }

  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(
      indexPath,
      config.platform === "native" ? REACT_NATIVE_INDEX_TEMPLATE : REACT_INDEX_TEMPLATE
    );
  }
}

export function appendIconExport(config: JsonConfig, iconName: string): void {
  const indexPath = path.join(process.cwd(), config.outputPath, INDEX_FILE_NAME);
  const exportStatement = `export * from "./${iconName}";\n`;

  fs.appendFileSync(indexPath, exportStatement);
}
