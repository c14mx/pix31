import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { getSvgFiles, searchRelatedFileNames } from "../lib/utils";
import chalk from "chalk";
import { select } from "@clack/prompts";

interface AddOptions {
  web?: boolean;
  native?: boolean;
}

export function configureAddCommand(program: Command) {
  program
    .command("add [icons...]")
    .description("Add icons to your project")
    .option("--web", "Generate React Web components (default)")
    .option("--native", "Generate React Native components")
    .action(async (icons: string[], options: AddOptions) => {
      await addCommand(icons, options);
    });
}

export async function addCommand(icons: string[], options: AddOptions) {
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
      const componentName = `${icon
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("")}Icon`;
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
            ...suggestions.map(name => ({
              value: name,
              label: name,
            })),
            {
              value: 'cancel',
              label: 'CANCEL',
            }
          ]
        });

        if (selected && selected !== 'cancel') {
          const componentName = `${selected
            .toString()
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("")}Icon`;
          const platformText = platform === "native" ? "React Native" : "React";
          console.log(`${chalk.green("✓")} ${componentName} (${platformText})`);
        }
      }
    }
  }
} 