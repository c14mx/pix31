import { CONFIG_FILE_NAME } from "@lib/constants";
import { JsonConfig, Platform } from "@lib/types";
import { DEFAULT_OUTPUT_PATH } from "@lib/constants";
import chalk from "chalk";
import { Command } from "commander";
import path from "path";
import fs from "fs";
import ora from "ora";
import prompts from "prompts";

export const getConfigPath = () => path.join(process.cwd(), CONFIG_FILE_NAME);

export const init = new Command()
  .name("init")
  .description("Create pix31.json config")
  .action(async () => {
    const config = await initializeConfig();

    if (!config) {
      console.log(chalk.yellow("Operation cancelled"));
      process.exit(1);
    }
  });

async function detectFramework(): Promise<Platform | null> {
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packagePath)) {
      return null;
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps["react-native"]) return "native";

    const webDeps = ["react", "react-dom", "next", "gatsby", "vite", "webpack"];
    if (webDeps.some((dep) => deps[dep])) return "web";

    return null;
  } catch (error) {
    return null;
  }
}

export async function initializeConfig(): Promise<JsonConfig | null> {
  const spinner = ora("Initializing config").start();
  const configPath = getConfigPath();

  try {
    if (fs.existsSync(configPath)) {
      spinner.stop();
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `${CONFIG_FILE_NAME} already exists. Would you like to overwrite it?`,
        initial: false,
      });

      if (!overwrite) {
        spinner.fail(`${CONFIG_FILE_NAME} already exists`);
        return null;
      }
    }

    spinner.stop();

    let platformType = await detectFramework();

    if (!platformType) {
      const { platform } = await prompts({
        type: "select",
        name: "platform",
        message: "Which framework are you using?",
        choices: [
          { title: "React", value: "web" },
          { title: "React Native", value: "native" },
        ],
        initial: 0,
      });

      if (platform === undefined) {
        spinner.info("Operation cancelled");
        return null;
      }

      platformType = platform;
    }

    const { outputPath } = await prompts({
      type: "text",
      name: "outputPath",
      message: "?",
      initial: DEFAULT_OUTPUT_PATH,
    });

    if (!outputPath) {
      spinner.info("Operation cancelled");
      return null;
    }

    spinner.start("Creating config file");

    const config: JsonConfig = {
      platform: platformType as Platform,
      outputPath,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    spinner.succeed("Config created!");
    console.log("\nCommands you can run:");
    console.log("  npx pix31 add [icon-name]   Add icons to your project");
    console.log("  npx pix31 browse            View all available icons");
    return config;
  } catch (error) {
    spinner.fail(`Error creating ${CONFIG_FILE_NAME}`);
    console.error(error);
    return null;
  }
}
