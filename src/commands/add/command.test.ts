// Mock all utils with proper types
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

// All mocks need to be defined before imports
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

// Add this with other mocks at the top
jest.mock('chalk', () => ({
  yellow: (str: string) => str,
  red: (str: string) => str,
  green: (str: string) => str === "✓" ? "✓" : str,
  white: (str: string) => str,
}));

// Imports come after all mocks
import chalk from "chalk";
import prompts from "prompts";
import { addCommand } from "./command";
import { LIB_NAME, CONFIG_FILE_NAME, PLATFORMS } from "../../lib/constants";

describe(`npx ${LIB_NAME} add`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all utils mocks to default values
    mockUtils.readConfig.mockReturnValue({
      platform: "web",
      outputPath: "src/components/icons"
    });
    mockUtils.getSvgFiles.mockReturnValue(["chevron-down.svg"]);
    mockUtils.generateIconComponent.mockResolvedValue(true);
    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");
    mockUtils.iconFileExists.mockReturnValue(false);
    mockUtils.searchRelatedFileNames.mockReturnValue(["chevron-down"]);

    // Mock console methods properly
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Mock prompts to return undefined by default
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
    mockUtils.readConfig.mockReturnValueOnce(null);  // Only return null for this test
    
    await addCommand(["some-icon"], {});

    expect(console.error).toHaveBeenCalledWith(
      chalk.yellow("!"),
      `${CONFIG_FILE_NAME} file not found. Initializing ${LIB_NAME}...`
    );
  });

  it("Generates icon component and appends export", async () => {
    // Mock getSvgFiles to return the file we want
    const svgFile = "path/to/chevron-down.svg";
    mockUtils.getSvgFiles.mockReturnValue([svgFile]);

    // Mock path.basename to return the icon name for both checks
    const pathMock = jest.requireMock("path");
    pathMock.basename.mockImplementation((file: string, ext?: string) => {
      if (ext === ".svg") return "chevron-down";
      return file;
    });

    // Mock searchRelatedFileNames to return empty array to avoid prompts flow
    mockUtils.searchRelatedFileNames.mockReturnValue([]);

    await addCommand(["chevron-down"], {});

    // Check if generateIconComponent was called with correct args
    expect(mockUtils.generateIconComponent).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down",
      svgFile  // Use the exact same file path
    );

    // Check if appendIconExport was called
    expect(mockUtils.appendIconExport).toHaveBeenCalledWith(
      { platform: "web", outputPath: "src/components/icons" },
      "chevron-down"
    );

    // Check success message
    expect(console.log).toHaveBeenCalledWith(
      `✓ ChevronDownIcon`
    );
  });

  it("Handles icon generation failure", async () => {
    // Mock prompts to return the icon name
    (prompts as unknown as jest.Mock).mockResolvedValueOnce({ selected: "chevron-down" });
    
    // Mock the error case
    mockUtils.generateIconComponent.mockRejectedValueOnce(new Error("Generation failed"));
    
    // Mock formatSvgFileNameToPascalCase to return correct name (without double "Icon")
    mockUtils.formatSvgFileNameToPascalCase.mockReturnValue("ChevronDown");

    await addCommand(["non-existent-icon"], {});

    expect(console.error).toHaveBeenCalledWith(
      "✖ Failed to generate ChevronDownIcon"
    );
  });
});
