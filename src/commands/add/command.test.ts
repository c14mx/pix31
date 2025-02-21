
const mockUtils = {
  readConfig: jest.fn(),
  getSvgFiles: jest.fn(),
  generateIconComponent: jest.fn(),
  appendIconExport: jest.fn(),
  formatSvgFileNameToPascalCase: jest.fn(),
  iconFileExists: jest.fn(),
  ensureIndexFile: jest.fn(),
  searchRelatedFileNames: jest.fn(),
};

jest.mock("../../lib/utils", () => mockUtils);
jest.mock("path", () => ({
  basename: jest.fn((file, ext) => {
    if (ext === ".svg") return "chevron-down";
    return file;
  }),
  join: jest.fn((...args) => args.join("/")),
}));
jest.mock("../init/command", () => ({
  initializeConfig: jest.fn().mockResolvedValue({
    platform: "web",
    outputPath: "src/components/icons"
  })
}));
jest.mock("ora", () => ({
  __esModule: true,
  default: () => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }),
}));
jest.mock("prompts", () => jest.fn());

jest.mock('chalk', () => ({
  yellow: (str: string) => str,
  red: (str: string) => str,
  green: (str: string) => str === "✓" ? "✓" : str,
  white: (str: string) => str,
}));

import chalk from "chalk";
import prompts from "prompts";
import { addCommand } from "./command";
import { LIB_NAME, CONFIG_FILE_NAME } from "../../lib/constants";

describe(`npx ${LIB_NAME} add`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUtils.readConfig.mockReturnValue({
      platform: "web",
      outputPath: "src/components/icons"
    });
    mockUtils.getSvgFiles.mockReturnValue(["chevron-down.svg"]);
    mockUtils.generateIconComponent.mockResolvedValue(true);
    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");
    mockUtils.iconFileExists.mockReturnValue(false);
    mockUtils.searchRelatedFileNames.mockReturnValue(["chevron-down"]);

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    (prompts as unknown as jest.Mock).mockResolvedValue({ selected: undefined });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Shows help message when no icons specified", async () => {
    await addCommand([], {});
    
    expect(console.log).toHaveBeenCalledWith(
      chalk.yellow("What would you like to add?")
    );
  });

  it("Initializes config when not found", async () => {
    mockUtils.readConfig.mockReturnValueOnce(null);
    
    await addCommand(["some-icon"], {});

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

    await addCommand(["chevron-down"], {});

    expect(mockUtils.generateIconComponent).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down",
      svgFile
    );

    expect(mockUtils.appendIconExport).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down"
    );

    expect(console.log).toHaveBeenCalledWith(
      `✓ ChevronDownIcon`
    );
  });

  it("Handles icon generation failure", async () => {
    (prompts as unknown as jest.Mock).mockResolvedValueOnce({ selected: "chevron-down" });
    
    mockUtils.generateIconComponent.mockRejectedValueOnce(new Error("Generation failed"));
    
    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");

    await addCommand(["non-existent-icon"], {});

    expect(console.error).toHaveBeenCalledWith(
      "✖ Failed to generate ChevronDownIcon"
    );
  });
});
