import fs from "fs";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { parse as parseSVG } from "svgson";
import { Command } from "commander";
import { addCommand } from "../commands/add/command";

import {
  CONFIG_FILE_NAME,
  LIB_NAME,
  NUMBER_WORDS,
  REACT_INDEX_TEMPLATE,
  REACT_NATIVE_INDEX_TEMPLATE,
} from "@lib/constants";
import { JsonConfig, GenerationStats, SVGNode } from "@lib/types";

export function convertNumberToWord(name: string): string {
  if (!name) return "";

  if (/^\d/.test(name)) {
    const firstChar = name[0];
    if (firstChar) {
      return NUMBER_WORDS[firstChar] + name.slice(1);
    }
    return "";
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

    if (pathElements.length === 0) return null;

    return pathElements
      .map((element) => element?.attributes?.d)
      .filter((d: string | undefined) => d !== undefined);
  } catch (error) {
    console.error("Failed to parse SVG:", error);
    return null;
  }
}

export function findAllPathElements(node: SVGNode): SVGNode[] {
  let paths: SVGNode[] = [];
  if (node.name === "path") paths.push(node);

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
    <Icon ref={ref} {...props}>${pathElements ? "\n" + pathElements : ""}
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
  const svgDir = path.join(process.cwd(), "node_modules", "pixelarticons", "svg");

  try {
    return fs
      .readdirSync(svgDir)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => path.join(svgDir, file));
  } catch (error) {
    throw new Error(
      "Failed to find SVG files. Please install pixelarticons package with: npm install pixelarticons"
    );
  }
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
  if (!str1 || !str2) return 0;

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

export function readConfig(): JsonConfig | null {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    return null;
  }
}

export function ensureIndexFile(config: JsonConfig): void {
  const indexPath = path.join(process.cwd(), config.outputPath, "index.ts");

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
  const indexPath = path.join(process.cwd(), config.outputPath, "index.ts");
  const existingContent = fs.readFileSync(indexPath, "utf-8");
  const exportLine =
    config.platform === "native"
      ? getReactNativeExportLine(iconName)
      : getReactExportLine(iconName);

  const hasExport = existingContent.split("\n").some((line) => line.trim() === exportLine);

  if (!hasExport) {
    const needsNewline = existingContent.length > 0 && !existingContent.endsWith("\n");
    const contentToAppend = needsNewline ? `\n${exportLine}\n` : `${exportLine}\n`;

    fs.appendFileSync(indexPath, contentToAppend);
  }
}

export function iconFileExists(config: JsonConfig, iconName: string): boolean {
  const outputDir = path.join(process.cwd(), config.outputPath);
  const iconPath = path.join(outputDir, `${iconName}.tsx`);
  return fs.existsSync(iconPath);
}

export async function promptOverride(componentName: string): Promise<boolean> {
  const { override } = await prompts({
    type: "confirm",
    name: "override",
    message: `Would you like to override /${componentName}.tsx`,
  });

  return override === true;
}

export async function generateIconComponent(
  config: JsonConfig,
  iconName: string,
  svgFilePath: string
): Promise<boolean> {
  const outputDir = path.join(process.cwd(), config.outputPath);
  const componentName = `${formatSvgFileNameToPascalCase(iconName)}Icon`;

  if (iconFileExists(config, iconName)) {
    console.log(`${chalk.yellow("!")} ${componentName} already exists in ${config.outputPath}`);
    const shouldOverride = await promptOverride(componentName);
    if (!shouldOverride) {
      return false;
    }
  }

  const svgContent = fs.readFileSync(svgFilePath, "utf-8");
  const pathData = await extractSVGPath(svgContent);

  if (!pathData) {
    throw new Error(`Failed to extract path data from ${iconName}`);
  }

  const componentContent =
    config.platform === "native"
      ? generateReactNativeComponent(componentName, pathData)
      : generateReactComponent(componentName, pathData);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, `${iconName}.tsx`), componentContent);

  return true;
}

export function getReactNativeExportLine(iconName: string): string {
  return `export * from "./${iconName}";`;
}

export function getReactExportLine(iconName: string): string {
  const nameWithWords = convertNumberToWord(iconName);
  const componentName = `${toPascalCase(nameWithWords)}Icon`;
  return `export { ${componentName} } from "./${iconName}";`;
}

export async function generateReactIcons(): Promise<GenerationStats> {
  const stats: GenerationStats = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: [],
  };

  const svgDir = path.resolve("node_modules/pixelarticons/svg");
  const outputDir = path.resolve("react-icons");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgFiles = fs.readdirSync(svgDir).filter((file) => file.endsWith(".svg"));
  stats.totalFiles = svgFiles.length;

  for (const svgFile of svgFiles) {
    try {
      const svgContent = fs.readFileSync(path.join(svgDir, svgFile), "utf-8");
      const pathData = await extractSVGPath(svgContent);

      if (!pathData) {
        throw new Error("Could not extract path data from SVG");
      }

      const componentName = formatSvgFileNameToPascalCase(svgFile);
      const componentContent = generateReactComponent(componentName + "Icon", pathData);
      const outputPath = path.join(outputDir, `${componentName}.tsx`);

      fs.writeFileSync(outputPath, componentContent);
      stats.successfulFiles++;
    } catch (error) {
      stats.failedFiles.push(svgFile);
    }
  }

  return stats;
}

export async function generateIndexFile(): Promise<void> {
  const reactIconsDir = path.resolve("react-icons");
  const indexPath = path.join(reactIconsDir, "index.ts");

  let indexContent = `export { Pix31Icon, Pix31IconProps } from "../lib/pix31-icon";\n\n`;

  const tsxFiles = fs
    .readdirSync(reactIconsDir)
    .filter((file) => file.endsWith(".tsx"))
    .filter((file) => file !== "pix31-icon.tsx");

  for (const file of tsxFiles) {
    const componentName = path.basename(file, ".tsx") + "Icon";
    const importPath = "./" + path.basename(file, ".tsx");
    indexContent += `export { ${componentName} } from '${importPath}';\n`;
  }

  fs.writeFileSync(indexPath, indexContent);
  console.log(`Generated index file with ${tsxFiles.length} icon exports`);
}

export function configureAddCommand(program: Command): void {
  program
    .command("add [icons...]")
    .description("Add icons to your project")
    .action((icons: string[]) => {
      addCommand(icons);
    });
}

export function printInitSuccess(config: JsonConfig): void {
  console.log("");
  console.log(chalk.cyan("info"), "Thanks for choosing pix31 to manage your pixelarticons");
  console.log(chalk.cyan("info"));
  console.log(chalk.cyan("info"), "You should be set up to start using pix31 now!");
  console.log(chalk.cyan("info"));
  console.log(chalk.cyan("info"), "We have added a couple of things to help you out:");
  console.log(chalk.cyan("info"), `- ${CONFIG_FILE_NAME} contains your icon configuration`);
  console.log(chalk.cyan("info"), `- ${config.outputPath} will contain your icon components`);
  console.log("");
  console.log("Commands you can run:");
  console.log(`  npx ${LIB_NAME} browse                     Open pixelarticons website in browser`);
  console.log(`  npx ${LIB_NAME} add [icon-1] [icon-2] ...  Add icons to your project`);
}
