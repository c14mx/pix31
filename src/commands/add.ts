import chalk from "chalk";
import * as path from "path";
import { select } from "@clack/prompts";

import {
  getSvgFiles,
  searchRelatedFileNames,
  formatSvgFileNameToPascalCase,
  readConfig,
  initializeConfig,
  ensureIndexFile,
  appendIconExport,
  generateIconComponent,
  iconFileExists,
} from "../lib/utils";
import { AddCLIOptions } from "../lib/types";
import { PLATFORMS } from "../lib/constants";

export async function addCommand(icons: string[], options: AddCLIOptions) {
  if (!icons.length) {
    console.log(
      chalk.yellow(
        'Type out which icons you want to install. Run "hako list" to browse available icon names.'
      )
    );
    return;
  }

  let config = readConfig();
  if (!config) {
    console.error(chalk.red("✖"), "icons.json configuration file not found.");
    config = await initializeConfig();
    if (!config) {
      console.log(chalk.yellow("Operation cancelled"));
      return;
    }
  }

  ensureIndexFile(config);

  const svgFiles = getSvgFiles();
  const availableIcons = svgFiles.map((file) => path.basename(file, ".svg"));

  for (const icon of icons) {
    if (availableIcons.includes(icon)) {
      const componentName = `${formatSvgFileNameToPascalCase(icon)}Icon`;
      const platformText = PLATFORMS[config.platform];
      
      try {
        const svgFile = svgFiles.find(file => path.basename(file, '.svg') === icon);
        if (!svgFile) throw new Error(`Could not find SVG file for ${icon}`);

        // Generate the icon component and track if it was actually generated
        const wasGenerated = await generateIconComponent(config, icon, svgFile);
        
        // Add the export to index file if the component was generated or overridden
        if (wasGenerated) {
          appendIconExport(config, icon);
          console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
        }
      } catch (error) {
        console.error(`${chalk.red("✖")} Failed to generate ${componentName}:`, error);
      }
    } else {
      const suggestions = searchRelatedFileNames(icon, availableIcons);
      console.log(`${chalk.red("✗")} "${icon}" not found.`);

      if (suggestions.length > 0) {
        console.log(`${chalk.magenta("?")} Here are other similar icons:`);
        const selected = await select({
          message: "Select an icon",
          options: [
            ...suggestions.map((name) => ({
              value: name,
              label: name,
            })),
            {
              value: "cancel",
              label: "CANCEL",
            },
          ],
        });

        if (selected && selected !== "cancel") {
          const selectedIcon = selected.toString();
          const componentName = `${formatSvgFileNameToPascalCase(selectedIcon)}Icon`;
          const platformText = PLATFORMS[config.platform];
          
          try {
            // Find the full path of the SVG file
            const svgFile = svgFiles.find(file => path.basename(file, '.svg') === selectedIcon);
            if (!svgFile) throw new Error(`Could not find SVG file for ${selectedIcon}`);

            // Generate the icon component
            await generateIconComponent(config, selectedIcon, svgFile);
            
            // Add the export to index file (only if component was generated)
            if (!iconFileExists(config, selectedIcon)) {
              appendIconExport(config, selectedIcon);
            }
            
            console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
          } catch (error) {
            console.error(`${chalk.red("✖")} Failed to generate ${componentName}:`, error);
          }
        }
      }
    }
  }
}
