#!/usr/bin/env node

import { Command } from "commander";

import { configureAddCommand } from "./lib/utils";
import { init } from "./commands/init/command";
import { browse } from "./commands/browse/command";

const program = new Command();

program
  .name("pix31")
  .description("A CLI to add pixelarticons to your React and React Native projects.")
  .version("1.0.0");

program.command("browse").description("Open Pixelarticons website in browser").action(browse);

configureAddCommand(program);

program.addCommand(init);

program.parse();

export function cli(): void {
  const program = new Command().addCommand(init);
}
