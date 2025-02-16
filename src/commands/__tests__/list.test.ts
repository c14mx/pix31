import { listCommand } from "../list";
import { getSvgFiles } from "../../lib/utils";
import { intro, select, outro } from "@clack/prompts";
import terminalImage from "term-img";
import * as fs from "fs";
import * as path from "path";

// Mock dependencies
jest.mock("@clack/prompts", () => ({
  intro: jest.fn(),
  select: jest.fn(),
  outro: jest.fn(),
}));

jest.mock("term-img", () => jest.fn());
jest.mock("../../lib/utils", () => ({
  getSvgFiles: jest.fn(),
}));

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(),
}));

describe("listCommand", () => {
  const mockSvgFiles = [path.join("svg-icons", "icon1.svg"), path.join("svg-icons", "icon2.svg")];
  const mockSvgContent = '<svg width="24" height="24"><path d="M1 1"/></svg>';

  beforeEach(() => {
    jest.clearAllMocks();
    (getSvgFiles as jest.Mock).mockReturnValue(mockSvgFiles);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockSvgContent);
    (terminalImage as jest.Mock).mockReturnValue("🎨");
    (select as jest.Mock).mockResolvedValue(mockSvgFiles[0]);
  });

  it("displays list of icons and handles selection", async () => {
    await listCommand();

    // Verify intro was called
    expect(intro).toHaveBeenCalledWith("Hako Icon Browser");

    // Verify select was called with correct options
    expect(select).toHaveBeenCalledWith({
      message: "Select an icon to preview",
      options: mockSvgFiles.map((file) => ({
        value: file,
        label: path.basename(file, ".svg"),
        hint: "🎨",
      })),
    });

    // Verify outro was called
    expect(outro).toHaveBeenCalledWith("Thanks for using Hako!");
  });

  it("handles terminal image preview failures gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    (terminalImage as jest.Mock).mockImplementation(() => {
      throw new Error("Terminal does not support images");
    });

    await listCommand();

    expect(consoleSpy).toHaveBeenCalledWith("(SVG preview not available in this terminal)");
    consoleSpy.mockRestore();
  });

  it("does nothing when no icon is selected", async () => {
    (select as jest.Mock).mockResolvedValue(null);
    const consoleSpy = jest.spyOn(console, "log");

    await listCommand();

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
