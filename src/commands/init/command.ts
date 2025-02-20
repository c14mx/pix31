import chalk from "chalk";
import { Command } from "commander";
import { initializeConfig } from "@lib/utils";

export const init = new Command()
  .name("init")
  .description("Initialize an icons.json configuration file")
  .action(async () => {
    const config = await initializeConfig();
    
    if (!config) {
      console.log(chalk.yellow("Operation cancelled"));
      process.exit(1);
    }
  });
