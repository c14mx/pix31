import * as path from "path";
import { getSvgFiles, searchRelatedFileNames, formatSvgFileNameToPascalCase } from "../lib/utils";
import chalk from "chalk";
import { select } from "@clack/prompts";
import { AddCLIOptions } from "@lib/types";

export async function addCommand(icons: string[], options: AddCLIOptions) {
  if (!icons.length) {
    console.log(
      chalk.yellow(
        'Type out which icons you want to install. Run "hako list" to browse available icon names.'
      )
    );
    return;
  }

  const platform = options.native ? "native" : "web";
  const availableIcons = getSvgFiles().map((file) => path.basename(file, ".svg"));

  for (const icon of icons) {
    if (availableIcons.includes(icon)) {
      const componentName = `${formatSvgFileNameToPascalCase(icon)}Icon`;
      const platformText = platform === "native" ? "React Native" : "React";
      console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
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
          const platformText = platform === "native" ? "React Native" : "React";
          console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
        }
      }
    }
  }
}
