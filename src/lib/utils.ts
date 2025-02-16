import { NUMBER_WORDS } from "./constants";
import { parse as parseSVG } from "svgson";
import path from "path";
import fs from "fs";

export function convertNumberToWord(name: string): string {
  if (/^\d/.test(name)) {
    const firstChar = name[0];
    return NUMBER_WORDS[firstChar] + name.slice(1);
  }
  return name;
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function formatSvgFileNameToPascalCase(filename: string): string {
  const baseName = path.basename(filename, ".svg");
  const nameWithWords = convertNumberToWord(baseName);
  return toPascalCase(nameWithWords);
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
import { Icon, IconProps } from '../lib/icon';

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
import { Icon, IconProps } from '../lib/icon';

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
    .map(name => ({
      name,
      score: calculateSimilarity(query, name)
    }))
    .filter(item => item.score > 0.3) // Only show reasonably similar matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.name);
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Check for substring matches
  if (s2.includes(s1) || s1.includes(s2)) return 0.8;
  
  // Check for word matches
  const words1 = s1.split('-');
  const words2 = s2.split('-');
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) return 0.5 + (commonWords.length / Math.max(words1.length, words2.length) * 0.3);
  
  // Calculate character-based similarity
  let matches = 0;
  const maxLength = Math.max(s1.length, s2.length);
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / maxLength;
}
