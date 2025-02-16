#!/usr/bin/env node

import { Command } from "commander";
import { listCommand } from "./commands/list";
import { configureAddCommand } from "./commands/add";

const program = new Command();

program.name("hako").description("Hako Icon CLI tools").version("1.0.0");

program.command("list").description("Browse and preview available icons").action(listCommand);

configureAddCommand(program);

program.parse();
