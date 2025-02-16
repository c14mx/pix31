import { numberWords } from "./constants";
import { parse as parseSVG } from "svgson";
import path from "path";

export function convertNumberToWord(name: string): string {
  if (/^\d/.test(name)) {
    const firstChar = name[0];
    return numberWords[firstChar] + name.slice(1);
  }
  return name;
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

export function toComponentName(filename: string): string {
  const baseName = path.basename(filename, ".svg");
  const nameWithWords = convertNumberToWord(baseName);
  return toPascalCase(nameWithWords);
}

export async function extractSVGPath(svgContent: string): Promise<string | null> {
  try {
    const parsed = await parseSVG(svgContent);
    const pathElement = findPathElement(parsed);
    if (pathElement && pathElement.attributes) {
      return pathElement.attributes.d;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse SVG:", error);
    return null;
  }
}

export function findPathElement(node: any): any {
  if (node.name === "path") {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const result = findPathElement(child);
      if (result) return result;
    }
  }
  return null;
}


export function generateReactNativeComponent(componentName: string, pathData: string): string {
  return `import React from 'react';
import { Path } from 'react-native-svg';
import { Icon, IconProps } from '../lib/icon';

export const ${componentName} = React.forwardRef<any, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <Path d="${pathData}" fill={props.color ?? "currentColor"} />
    </Icon>
  );
});

${componentName}.displayName = "${componentName}";
`;
}

export function generateReactComponent(componentName: string, pathData: string): string {
  return `import React from 'react';
import { HakoIcon, HakoIconProps } from '../lib/hako-icon';

export const ${componentName} = React.forwardRef<SVGSVGElement, HakoIconProps>(({
  ...props
}, ref) => {
  return (
    <HakoIcon ref={ref} {...props}>
      <path d="${pathData}" fill="currentColor"/>
    </HakoIcon>
  );
}) as React.ForwardRefExoticComponent<HakoIconProps & React.RefAttributes<SVGSVGElement>>;

${componentName}.displayName = "${componentName}";
`;
}