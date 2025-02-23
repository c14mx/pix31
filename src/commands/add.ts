import chalk from "chalk";
import * as path from "path";
import prompts from "prompts";

import {
  readConfig,
  ensureIndexFile,
  getSvgFiles,
  formatSvgFileNameToPascalCase,
  generateIconComponent,
  appendIconExport,
  searchRelatedFileNames,
  iconFileExists,
} from "@lib/utils";
import { initializeConfig } from "@commands/init";
import { CONFIG_FILE_NAME, LIB_NAME } from "@lib/constants";

export async function addCommand(icons: string[]): Promise<void> {
  if (!icons.length) {
    console.log(chalk.yellow("What would you like to add?"));
    return;
  }

  let config = readConfig();
  if (!config) {
    console.error(
      chalk.yellow("!"),
      `${CONFIG_FILE_NAME} file not found. Initializing ${LIB_NAME}...`
    );
    config = await initializeConfig();
    if (!config) {
      return;
    }
  }

  ensureIndexFile(config);

  const svgFiles = getSvgFiles();
  const availableIcons = svgFiles.map((file) => path.basename(file, ".svg"));

  for (const icon of icons) {
    if (availableIcons.includes(icon)) {
      const componentName = `${formatSvgFileNameToPascalCase(icon)}Icon`;

      try {
        const svgFile = svgFiles.find((file) => path.basename(file, ".svg") === icon);
        if (!svgFile) throw new Error(`svg file not found ${icon}`);

        const wasGenerated = await generateIconComponent(config, icon, svgFile);

        if (wasGenerated) {
          appendIconExport(config, icon);
          console.log(`${chalk.green("✓")} ${componentName}`);
        }
      } catch (error) {
        console.error(`${chalk.red("✖")} Failed to generate ${componentName}`);
      }
    } else {
      const suggestions = searchRelatedFileNames(icon, availableIcons);
      console.log(`${chalk.yellow("!")} "${icon}" not found.`);

      if (suggestions.length > 0) {
        console.log(`${chalk.white("✓")} Other available icons:`);
        const { selected } = await prompts({
          type: "select",
          name: "selected",
          message: "Select an icon",
          choices: [
            ...suggestions.map((name) => ({
              title: name,
              value: name,
            })),
            {
              title: "CANCEL",
              value: "cancel",
            },
          ],
        });

        if (selected && selected !== "cancel") {
          const selectedIcon = selected.toString();
          const componentName = `${formatSvgFileNameToPascalCase(selectedIcon)}Icon`;

          try {
            const svgFile = svgFiles.find((file) => path.basename(file, ".svg") === selectedIcon);
            if (!svgFile) throw new Error(`Could not find SVG file for ${selectedIcon}`);

            await generateIconComponent(config, selectedIcon, svgFile);

            if (!iconFileExists(config, selectedIcon)) {
              appendIconExport(config, selectedIcon);
            }

            console.log(`${chalk.green("✓")} ${componentName}`);
          } catch (error) {
            console.error(`${chalk.red("✖")} Failed to generate ${componentName}`);
          }
        }
      }
    }
  }
}
