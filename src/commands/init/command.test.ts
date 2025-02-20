import fs from "fs";
import path from "path";
import { init } from "./command";
import { CONFIG_FILE_NAME } from "../../lib/constants";
import { JsonConfig } from "../../lib/types";

jest.mock("fs");
jest.mock("path");

jest.mock("chalk", () => ({
  green: (str: string) => str,
  red: (str: string) => str,
}));

describe("init command", () => {
  const mockCwd = "/fake/path";
  const expectedConfigPath = `/fake/path/${CONFIG_FILE_NAME}`;

  // Mock console methods
  const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const originalProcessExit = process.exit;

  beforeAll(() => {
    // Mock process.cwd
    jest.spyOn(process, "cwd").mockReturnValue(mockCwd);
    // Mock process.exit
    // @ts-ignore - we're intentionally mocking this
    process.exit = jest.fn();
  });

  afterAll(() => {
    process.exit = originalProcessExit;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Mock path.join to return expected path
    (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join("/"));
  });

  it("creates a web config file by default", async () => {
    // Mock fs.existsSync to return false (file doesn't exist)
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await init.parseAsync(["node", "test"]);

    const expectedConfig: JsonConfig = {
      platform: "web",
      outputPath: "src/components/icons",
    };

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockCwd + `/${CONFIG_FILE_NAME}`,
      JSON.stringify(expectedConfig, null, 2)
    );
    expect(mockConsoleLog).toHaveBeenCalledWith("✓", `Successfully created ${CONFIG_FILE_NAME}`);
  });

  it("creates a native config file when --native flag is used", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await init.parseAsync(["node", "test", "--native"]);

    const expectedConfig: JsonConfig = {
      platform: "native",
      outputPath: "src/components/icons",
    };

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockCwd + `/${CONFIG_FILE_NAME}`,
      JSON.stringify(expectedConfig, null, 2)
    );
    expect(mockConsoleLog).toHaveBeenCalledWith("✓", `Successfully created ${CONFIG_FILE_NAME}`);
  });

  it("fails if icons.json already exists", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockClear();

    await init.parseAsync(["node", "test"]);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(
      "✖",
      `Error: ${CONFIG_FILE_NAME} already exists`
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("handles file system errors", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Write error");
    });

    await init.parseAsync(["node", "test"]);

    expect(mockConsoleError).toHaveBeenCalledWith(
      "✖",
      `Error creating ${CONFIG_FILE_NAME}:`,
      new Error("Write error")
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
