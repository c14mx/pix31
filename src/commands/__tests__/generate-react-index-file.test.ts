import { generateIndexFile } from "../generate-react-index-file";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe("generateIndexFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readdirSync as jest.Mock).mockReturnValue(["Icon1.tsx", "Icon2.tsx", "hako-icon.tsx"]);
  });

  it("generates index file with correct exports", async () => {
    await generateIndexFile();

    const expectedContent = expect.stringContaining("export { Icon1Icon } from './Icon1'");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("index.ts"),
      expectedContent
    );
  });

  it("excludes hako-icon.tsx from component exports", async () => {
    await generateIndexFile();

    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
    // Verify the base import is included
    expect(writeCall).toContain('from "../lib/hako-icon"');
    // Verify hako-icon isn't included in the component exports
    expect(writeCall).not.toMatch(/export.*from ['"]\.\/hako-icon['"]/);
  });

  it("logs generation summary", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    await generateIndexFile();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Generated index file with 2 icon exports")
    );
    consoleSpy.mockRestore();
  });
});
