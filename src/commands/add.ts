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
} from "@lib/utils";
import { AddCLIOptions } from "@lib/types";
import { PLATFORMS } from "@lib/constants";

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

  const availableIcons = getSvgFiles().map((file) => path.basename(file, ".svg"));

  for (const icon of icons) {
    if (availableIcons.includes(icon)) {
      const componentName = `${formatSvgFileNameToPascalCase(icon)}Icon`;
      const platformText = PLATFORMS[config.platform];
      console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
      appendIconExport(config, icon);
    } else {
      const suggestions = searchRelatedFileNames(icon, availableIcons);
      console.log(`${chalk.red("✗")} "${icon}" not found.`);

      if (suggestions.length > 0) {
        console.log(chalk.green("✓ Are you looking for one of these icons?"));
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
          const componentName = `${formatSvgFileNameToPascalCase(selected.toString())}Icon`;
          const platformText = PLATFORMS[config.platform];
          console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
          appendIconExport(config, selected.toString());
        }
      }
    }
  }
}
