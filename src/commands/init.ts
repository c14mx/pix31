import fs from "fs";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import { Command } from "commander";
import { execSync } from "child_process";
import { createSpinner } from "nanospinner";

import { printInitSuccess } from "@lib/utils";
import { JsonConfig, Platform } from "@lib/types";
import { CONFIG_FILE_NAME, PLATFORMS } from "@lib/constants";

export const getConfigPath = (): string => {
  return path.join(process.cwd(), CONFIG_FILE_NAME);
};

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

function checkPackageExists(packageName: string): boolean {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
    );
    return !!(
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (error) {
    return false;
  }
}

async function installDependencies(platform: "web" | "native"): Promise<void> {
  if (platform === "native") {
    const missingDeps = [];

    if (!checkPackageExists("react-native-svg")) missingDeps.push("react-native-svg");
    if (!checkPackageExists("pixelarticons")) missingDeps.push("pixelarticons");

    if (missingDeps.length > 0) {
      const spinner = createSpinner(
        `Installing dependencies: ${missingDeps.join(", ")}...`
      ).start();
      try {
        execSync(`npm install ${missingDeps.join(" ")}`, { stdio: "pipe" });
        spinner.success({ text: "Installed dependencies" });
      } catch (error) {
        spinner.error({ text: "Failed to install dependencies" });
        throw error;
      }
    }
  } else {
    const missingDeps = [];
    const missingDevDeps = [];

    if (!checkPackageExists("tailwind-merge")) missingDeps.push("tailwind-merge");
    if (!checkPackageExists("tailwindcss-animate")) missingDeps.push("tailwindcss-animate");
    if (!checkPackageExists("pixelarticons")) missingDeps.push("pixelarticons");
    if (!checkPackageExists("tailwindcss")) missingDevDeps.push("tailwindcss");

    if (missingDeps.length > 0) {
      const spinner = createSpinner(
        `Installing dependencies: ${missingDeps.join(", ")}...`
      ).start();
      try {
        execSync(`npm install ${missingDeps.join(" ")}`, { stdio: "pipe" });
        spinner.success({ text: "Installed dependencies" });
      } catch (error) {
        spinner.error({ text: "Failed to install dependencies" });
        throw error;
      }
    }

    if (missingDevDeps.length > 0) {
      const spinner = createSpinner(
        `Installing dev dependencies: ${missingDevDeps.join(", ")}...`
      ).start();
      try {
        execSync(`npm install -D ${missingDevDeps.join(" ")}`, { stdio: "pipe" });
        spinner.success({ text: "Installed dev dependencies" });
      } catch (error) {
        spinner.error({ text: "Failed to install dev dependencies" });
        throw error;
      }
    }
  }
}

export async function initializeConfig(): Promise<JsonConfig | null> {
  const configPath = getConfigPath();

  if (fs.existsSync(configPath)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `${CONFIG_FILE_NAME} already exists. Would you like to overwrite it?`,
      initial: false,
    });

    if (!overwrite) return null;
  }

  let platform = await detectFramework();

  if (!platform) {
    const response = await prompts({
      type: "select",
      name: "platform",
      message: "Select your platform",
      choices: [
        { title: PLATFORMS.web, value: "web" },
        { title: PLATFORMS.native, value: "native" },
      ],
    });

    if (!response.platform) return null;
    platform = response.platform;
  }

  const { outputPath } = await prompts({
    type: "text",
    name: "outputPath",
    message: "What directory should the icons be added to?",
    initial: "app/components/icons",
    validate: (value) => value.length > 0 || "Please enter a valid path",
  });

  if (!outputPath) return null;

  try {
    await installDependencies(platform as "web" | "native");

    const config: JsonConfig = {
      platform: platform as Platform,
      outputPath,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    printInitSuccess();
    return config;
  } catch (error) {
    console.error(chalk.red("Failed to initialize config:"), error);
    return null;
  }
}
