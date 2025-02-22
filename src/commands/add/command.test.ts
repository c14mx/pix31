const mockUtils = {
  readConfig: jest.fn().mockReturnValue(null),
  getSvgFiles: jest.fn().mockReturnValue([]),
  generateIconComponent: jest.fn().mockResolvedValue(true),
  appendIconExport: jest.fn().mockReturnValue(undefined),
  formatSvgFileNameToPascalCase: jest.fn().mockReturnValue(""),
  iconFileExists: jest.fn().mockReturnValue(false),
  ensureIndexFile: jest.fn().mockReturnValue(undefined),
  searchRelatedFileNames: jest.fn().mockReturnValue([]),
};

jest.mock("../../lib/utils", () => mockUtils);
jest.mock("path", () => ({
  basename: jest.fn((file: string, ext?: string): string => {
    if (ext === ".svg") return "chevron-down";
    return file;
  }),
  join: jest.fn((...args: string[]): string => args.join("/")),
}));
jest.mock("../init/command", () => ({
  initializeConfig: jest.fn().mockResolvedValue({
    platform: "web",
    outputPath: "src/components/icons",
  }),
}));

jest.mock("ora", () => ({
  __esModule: true,
  default: (): OraMock => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }),
}));

jest.mock("prompts", () => jest.fn());

jest.mock("chalk", () => ({
  yellow: (str: string): string => str,
  red: (str: string): string => str,
  green: (str: string): string => (str === "✓" ? "✓" : str),
  white: (str: string): string => str,
}));

import chalk from "chalk";
import prompts from "prompts";
import { addCommand } from "./command";
import { OraMock } from "../../lib/types";
import { LIB_NAME, CONFIG_FILE_NAME } from "../../lib/constants";

describe(`npx ${LIB_NAME} add`, () => {
  beforeEach((): void => {
    jest.clearAllMocks();

    mockUtils.readConfig.mockReturnValue({
      platform: "web",
      outputPath: "src/components/icons",
    });
    mockUtils.getSvgFiles.mockReturnValue(["chevron-down.svg"]);
    mockUtils.generateIconComponent.mockResolvedValue(true);
    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");
    mockUtils.iconFileExists.mockReturnValue(false);
    mockUtils.searchRelatedFileNames.mockReturnValue(["chevron-down"]);

    jest.spyOn(console, "log").mockImplementation((): void => undefined);
    jest.spyOn(console, "error").mockImplementation((): void => undefined);

    (prompts as unknown as jest.Mock).mockResolvedValue({ selected: undefined });
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it("Shows help message when no icons specified", async () => {
    await addCommand([]);

    expect(console.log).toHaveBeenCalledWith(chalk.yellow("What would you like to add?"));
  });

  it("Initializes config when not found", async () => {
    mockUtils.readConfig.mockReturnValueOnce(null);

    await addCommand(["some-icon"]);

    expect(console.error).toHaveBeenCalledWith(
      chalk.yellow("!"),
      `${CONFIG_FILE_NAME} file not found. Initializing ${LIB_NAME}...`
    );
  });

  it("Generates icon component and appends export", async () => {
    const svgFile = "path/to/chevron-down.svg";
    mockUtils.getSvgFiles.mockReturnValue([svgFile]);

    const pathMock = jest.requireMock("path");
    pathMock.basename.mockImplementation((file: string, ext?: string) => {
      if (ext === ".svg") return "chevron-down";
      return file;
    });

    mockUtils.searchRelatedFileNames.mockReturnValue([]);

    await addCommand(["chevron-down"]);

    expect(mockUtils.generateIconComponent).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down",
      svgFile
    );

    expect(mockUtils.appendIconExport).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down"
    );

    expect(console.log).toHaveBeenCalledWith(`✓ ChevronDownIcon`);
  });

  it("Handles icon generation failure", async () => {
    (prompts as unknown as jest.Mock).mockResolvedValueOnce({ selected: "chevron-down" });

    mockUtils.generateIconComponent.mockRejectedValueOnce(new Error("Generation failed"));

    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");

    await addCommand(["non-existent-icon"]);

    expect(console.error).toHaveBeenCalledWith("✖ Failed to generate ChevronDownIcon");
  });
});
