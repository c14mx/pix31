import fs from 'fs';
import path from 'path';
import { parse as parseSVG } from 'svgson';

interface GenerationStats {
  totalSvgFiles: number;
  totalTsxGenerated: number;
  errorsCount: number;
  failedFiles: string[];
}

const numberWords: { [key: string]: string } = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine'
};

function convertNumberToWord(name: string): string {
  if (/^\d/.test(name)) {
    const firstChar = name[0];
    return numberWords[firstChar] + name.slice(1);
  }
  return name;
}

function toComponentName(filename: string): string {
  // Remove .svg extension
  const baseName = path.basename(filename, '.svg');
  
  // Convert numbers to words if filename starts with a number
  const nameWithWords = convertNumberToWord(baseName);
  
  // Convert to PascalCase
  return nameWithWords
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

async function extractSVGPath(svgContent: string): Promise<string | null> {
  try {
    const parsed = await parseSVG(svgContent);
    const pathElement = findPathElement(parsed);
    if (pathElement && pathElement.attributes) {
      return pathElement.attributes.d;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse SVG:', error);
    return null;
  }
}

function findPathElement(node: any): any {
  if (node.name === 'path') {
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

function generateReactComponent(componentName: string, pathData: string): string {
  return `import React from 'react';
import { HakoIcon, HakoIconProps } from './hako-icon';

export const ${componentName}: React.FC<HakoIconProps> = (props) => {
  return (
    <HakoIcon {...props}>
      <path d="${pathData}" fill="currentColor"/>
    </HakoIcon>
  );
};

${componentName}.displayName = "${componentName}";
`;
}

export async function generateReactIcons(): Promise<GenerationStats> {
  const stats: GenerationStats = {
    totalSvgFiles: 0,
    totalTsxGenerated: 0,
    errorsCount: 0,
    failedFiles: []
  };

  const svgDir = path.resolve('svg-icons');
  const outputDir = path.resolve('react-icons');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgFiles = fs.readdirSync(svgDir).filter(file => file.endsWith('.svg'));
  stats.totalSvgFiles = svgFiles.length;

  for (const svgFile of svgFiles) {
    try {
      const svgContent = fs.readFileSync(path.join(svgDir, svgFile), 'utf-8');
      const pathData = await extractSVGPath(svgContent);

      if (!pathData) {
        throw new Error('Could not extract path data from SVG');
      }

      const componentName = toComponentName(svgFile);
      const componentContent = generateReactComponent(componentName + 'Icon', pathData);
      const outputPath = path.join(outputDir, `${componentName}.tsx`);

      fs.writeFileSync(outputPath, componentContent);
      stats.totalTsxGenerated++;
    } catch (error) {
      stats.errorsCount++;
      stats.failedFiles.push(svgFile);
    }
  }

  return stats;
}

// Execute the generation if this file is run directly
if (require.main === module) {
  generateReactIcons().then(stats => {
    console.log('Generation Complete!');
    console.log(`Total SVG files: ${stats.totalSvgFiles}`);
    console.log(`Total TSX files generated: ${stats.totalTsxGenerated}`);
    console.log(`Total errors: ${stats.errorsCount}`);
    if (stats.failedFiles.length > 0) {
      console.log('Failed files:');
      stats.failedFiles.forEach(file => console.log(`- ${file}`));
    }
  });
} 