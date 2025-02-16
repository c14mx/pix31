import { Command } from "commander";
import { configureAddCommand } from "../../lib/utils";

jest.mock("../../lib/utils", () => {
  const actual = jest.requireActual("../../lib/utils");
  return {
    ...actual,
    getSvgFiles: jest.fn(),
    searchRelatedFileNames: jest.fn(),
  };
});

jest.mock("@clack/prompts", () => ({
  select: jest.fn(),
}));

describe("configureAddCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    configureAddCommand(program);
  });

  it("should configure the add command with correct options", () => {
    const addCommand = program.commands.find((cmd) => cmd.name() === "add");

    expect(addCommand).toBeDefined();
    expect(addCommand?.description()).toBe("Add icons to your project");
    expect(addCommand?.opts().web).toBeUndefined();
    expect(addCommand?.opts().native).toBeUndefined();
  });

  it("should have web and native options", () => {
    const addCommand = program.commands.find((cmd) => cmd.name() === "add");
    const options = addCommand?.options.map((opt) => opt.long);

    expect(options).toContain("--web");
    expect(options).toContain("--native");
  });
});
