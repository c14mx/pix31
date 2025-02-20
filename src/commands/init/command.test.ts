import fs from "fs";
import prompts from "prompts";
import { init } from "./command";
import { CONFIG_FILE_NAME } from "../../lib/constants";

jest.mock("fs");
jest.mock("prompts", () => jest.fn());

jest.mock("ora", () => {
  return {
    __esModule: true,
    default: () => ({
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      info: jest.fn().mockReturnThis(),
    }),
  };
});

describe("init command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Creates pix31.json config", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await init.parseAsync(["node", "test"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify({
        platform: "web",
        outputPath: "src/components/icons"
      }, null, 2)
    );
  });

  it ("If pix31.json exists prompt an overwrite", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const mockPrompts = prompts as unknown as jest.Mock;
    
    mockPrompts
      .mockResolvedValueOnce({ overwrite: true })
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await init.parseAsync(["node", "test"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify({
        platform: "web",
        outputPath: "src/components/icons"
      }, null, 2)
    );
  });

  it("Auto-inits React Native project", async () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    
    (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({
      dependencies: {
        'react-native': '^0.70.0'
      }
    }));

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts.mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await init.parseAsync(["node", "test"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify({
        platform: "native",
        outputPath: "src/components/icons"
      }, null, 2)
    );
  });

  it("Auto-inits React web project", async () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    
    (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    }));

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts.mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await init.parseAsync(["node", "test"]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify({
        platform: "web",
        outputPath: "src/components/icons"
      }, null, 2)
    );
  });

  it("Prompts for framework when package.json not found", async () => {
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await init.parseAsync(["node", "test"]);

    expect(mockPrompts).toHaveBeenCalledWith(expect.objectContaining({
      type: "select",
      name: "platform"
    }));
  });
});