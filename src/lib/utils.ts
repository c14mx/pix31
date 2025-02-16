import { NUMBER_WORDS } from "./constants";
import { parse as parseSVG } from "svgson";
import path from "path";

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

    return pathElements.map(element => element.attributes.d);
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
    .map(d => `      <Path d="${d}" fill={props.color ?? "currentColor"} />`)
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
  const pathElements = pathData
    .map(d => `      <path d="${d}" fill="currentColor"/>`)
    .join("\n");

  return `import React from 'react';
import { HakoIcon, HakoIconProps } from '../lib/hako-icon';

export const ${componentName} = React.forwardRef<SVGSVGElement, HakoIconProps>(({
  ...props
}, ref) => {
  return (
    <HakoIcon ref={ref} {...props}>
${pathElements}
    </HakoIcon>
  );
}) as React.ForwardRefExoticComponent<HakoIconProps & React.RefAttributes<SVGSVGElement>>;

${componentName}.displayName = "${componentName}";
`;
}