#!/usr/bin/env node

import { Command } from "commander";
import { listCommand } from "./commands/list";
import { configureAddCommand } from "./lib/utils";
import { init } from "./commands/init";

const program = new Command();

program.name("hako").description("Hako Icon CLI tools").version("1.0.0");

program.command("list").description("Browse and preview available icons").action(listCommand);

configureAddCommand(program);

program.addCommand(init);

program.parse();

export function cli(args: string[]) {
  const program = new Command()
    // ... existing code ...
    .addCommand(init);
  // ... existing code ...
}
