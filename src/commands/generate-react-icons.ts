import fs from "fs";
import path from "path";
import {
  extractSVGPath,
  generateReactComponent,
  formatSvgFileNameToPascalCase,
} from "../lib/utils";
import { GenerationStats } from "../lib/types";

export async function generateReactIcons(): Promise<GenerationStats> {
  const stats: GenerationStats = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: [],
  };

  const svgDir = path.resolve("svg-icons");
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

if (require.main === module) {
  generateReactIcons().then((stats) => {
    console.log("Generation Complete!");
    console.log(`Total files: ${stats.totalFiles}`);
    console.log(`Successfully generated: ${stats.successfulFiles}`);
    console.log(`Failed files: ${stats.failedFiles.length}`);
  });
}
