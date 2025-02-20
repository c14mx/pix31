import fs from "fs/promises";
import { select } from "@clack/prompts";
import { addCommand } from "./command";

jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

jest.mock("@clack/prompts", () => ({
  select: jest.fn(),
  intro: jest.fn(),
  outro: jest.fn(),
  text: jest.fn(),
}));

jest.mock("../../lib/utils", () => ({
  getSvgFiles: jest.fn().mockReturnValue(["chevron-down.svg", "chevron-up.svg"]),
  searchRelatedFileNames: jest.fn().mockReturnValue(["chevron-down"]),
  formatSvgFileNameToPascalCase: jest.fn(
    (name: string) =>
      name
        .split("-")
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("") + "Icon"
  ),
  generateIconComponent: jest.fn().mockResolvedValue(true),
  readConfig: jest.fn().mockReturnValue({
    platform: "web",
    outputPath: "src/components/icons",
  }),
  ensureIndexFile: jest.fn(),
  appendIconExport: jest.fn(),
  iconFileExists: jest.fn().mockReturnValue(false),
}));

jest.mock("../../lib/constants", () => ({
  PLATFORMS: {
    web: "React",
    native: "React Native",
  },
  CONFIG_FILE_NAME: "pix31.config.json",
}));

describe("addCommand", () => {
  const mockCwd = "/fake/project";

  beforeAll(() => {
    jest.spyOn(process, "cwd").mockReturnValue(mockCwd);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (select as jest.Mock).mockResolvedValueOnce("chevron-down");
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  it("Handles icon selection from suggestions", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await addCommand(["non-existent-icon"], {});

    expect(select).toHaveBeenCalledWith({
      message: "Select an icon",
      options: [
        { value: "chevron-down", label: "chevron-down" },
        { value: "cancel", label: "CANCEL" },
      ],
    });

    const { generateIconComponent, appendIconExport } = require("../../lib/utils");
    expect(generateIconComponent).toHaveBeenCalled();
    expect(appendIconExport).toHaveBeenCalled();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("ChevronDownIcon (React)"));

    consoleSpy.mockRestore();
  });

  it("Handles cancellation", async () => {
    (select as jest.Mock).mockResolvedValue("cancel");

    await addCommand(["chevron"], {});

    const { generateIconComponent } = require("../../lib/utils");
    expect(generateIconComponent).not.toHaveBeenCalled();
  });

  it("Creates output directory if it doesn't exist", async () => {
    const { getConfig } = require("../../lib/utils");
    const config = { platform: "web", outputPath: "src/components/icons" };
    getConfig.mockResolvedValue(config);

    await addCommand(["chevron"], {});

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(config.outputPath), {
      recursive: true,
    });
  });

  it("Handles filesystem errors", async () => {
    (fs.writeFile as jest.Mock).mockRejectedValue(new Error("Write failed"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await addCommand(["chevron"], {});

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Error));

    consoleSpy.mockRestore();
  });

  it("Writes correct file content", async () => {
    const { generateIconComponent } = require("../../lib/utils");
    const mockComponent = {
      content: "export const ChevronDown = () => <svg>...</svg>",
      fileName: "ChevronDown.tsx",
    };
    generateIconComponent.mockResolvedValue(mockComponent);

    await addCommand(["chevron"], {});

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(mockComponent.fileName),
      mockComponent.content,
      "utf8"
    );
  });

  describe("generateIndexFile", () => {
    it("generates index file with correct exports", async () => {
      const { generateIndexFile } = require("../../lib/utils");
      const mockContent = `export { Icon1Icon } from './Icon1';`;
      generateIndexFile.mockResolvedValue(mockContent);

      await addCommand(["icon1"], {});

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("index.ts"),
        expect.any(String),
        "utf8"
      );
    });

    it("excludes pix31-icon.tsx from component exports", async () => {
      // Implementation depends on your actual code
      // Add specific test implementation here
    });

    it("logs generation summary", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await addCommand(["icon1"], {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Generated"));
      consoleSpy.mockRestore();
    });
  });
});
