import { generateReactIcons } from "../generate-react-icons";
import { extractSVGPath } from "../../lib/utils";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
}));

jest.mock("../../lib/utils", () => ({
  extractSVGPath: jest.fn(),
  generateReactComponent: jest.fn(),
  formatSvgFileNameToPascalCase: jest.fn(),
}));

describe("generateReactIcons", () => {
  const mockSvgFiles = ["icon1.svg", "icon2.svg"];
  const mockSvgContent = '<svg><path d="M1 1"/></svg>';
  const mockPathData = ["M1 1"];

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockSvgFiles);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockSvgContent);
    (extractSVGPath as jest.Mock).mockResolvedValue(mockPathData);
  });

  it("generates React components successfully", async () => {
    const stats = await generateReactIcons();

    expect(stats).toEqual({
      totalFiles: 2,
      successfulFiles: 2,
      failedFiles: [],
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it("handles SVG parsing failures", async () => {
    (extractSVGPath as jest.Mock).mockResolvedValue(null);

    const stats = await generateReactIcons();

    expect(stats).toEqual({
      totalFiles: 2,
      successfulFiles: 0,
      failedFiles: mockSvgFiles,
    });
  });

  it("creates output directory if it does not exist", async () => {
    await generateReactIcons();

    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("react-icons"), {
      recursive: true,
    });
  });
});
