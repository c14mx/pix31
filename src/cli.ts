#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { Command } from "commander";
import { dirname, join } from "path";

import { init } from "@commands/init";
import { browse } from "@commands/browse";
import { configureAddCommand } from "@lib/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const program = new Command();

program
  .name("pix31")
  .description("A CLI to add pixelarticons to your React and React Native projects.")
  .version(packageJson.version);

program.command("browse").description("Open Pixelarticons website in browser").action(browse);

configureAddCommand(program);

program.addCommand(init);

program.parse();
