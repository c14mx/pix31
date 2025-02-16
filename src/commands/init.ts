import fs from "fs";
import path from "path";
import chalk from "chalk";
import { Command } from "commander";

import { AddCLIOptions } from "@lib/types";
import { DEFAULT_NATIVE_CONFIG, DEFAULT_WEB_CONFIG } from "@lib/constants";

export const init = new Command()
  .name("init")
  .description("Initialize an icons.json configuration file")
  .option("--native", "Initialize config for React Native project")
  .option("--web", "Initialize config for React Web project (default)")
  .action(async (options: AddCLIOptions) => {
    const configPath = path.join(process.cwd(), "icons.json");

    if (fs.existsSync(configPath)) {
      console.error(chalk.red("✖"), "Hako already initialized in this directory");
      process.exit(1);
    }

    const config = options.native ? DEFAULT_NATIVE_CONFIG : DEFAULT_WEB_CONFIG;

    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green("✓"), "Successfully created icons.json");
    } catch (error) {
      console.error(chalk.red("✖"), "Error creating icons.json:", error);
      process.exit(1);
    }
  });
