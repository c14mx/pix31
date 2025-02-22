import { execSync } from "child_process";
import fs from "fs";
import prompts from "prompts";
import { initializeConfig } from "./command";
import { CONFIG_FILE_NAME, LIB_NAME } from "../../lib/constants";

type OraMock = {
  start: () => OraMock;
  stop: () => OraMock;
  succeed: () => OraMock;
  fail: () => OraMock;
};

jest.mock("fs");
jest.mock("prompts");
jest.mock("child_process");
jest.mock("ora", () => ({
  __esModule: true,
  default: (): OraMock => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }),
}));

describe(`npx ${LIB_NAME} init`, () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  it("Creates pix31.json config with custom output path", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "custom/icons/path" });

    await initializeConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify(
        {
          platform: "web",
          outputPath: "custom/icons/path",
        },
        null,
        2
      )
    );
  });

  it("If pix31.json exists prompt an overwrite", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const mockPrompts = prompts as unknown as jest.Mock;

    mockPrompts
      .mockResolvedValueOnce({ overwrite: true })
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await initializeConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify(
        {
          platform: "web",
          outputPath: "src/components/icons",
        },
        null,
        2
      )
    );
  });

  it("Prompts for output directory with default value", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const mockPrompts = prompts as unknown as jest.Mock;

    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "app/components/icons" });

    await initializeConfig();

    expect(mockPrompts).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
        name: "outputPath",
        message: "What directory should the icons be added to?",
        initial: "app/components/icons",
        validate: expect.any(Function),
      })
    );
  });

  it("Returns null if outputPath is not provided", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const mockPrompts = prompts as unknown as jest.Mock;

    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: null });

    const result = await initializeConfig();
    expect(result).toBeNull();
  });

  it("Auto-inits React Native project", async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);
    (fs.readFileSync as jest.Mock).mockReturnValueOnce(
      JSON.stringify({
        dependencies: {
          "react-native": "^0.70.0",
        },
      })
    );

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts.mockResolvedValueOnce({ outputPath: "app/components/icons" });

    await initializeConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify(
        {
          platform: "native",
          outputPath: "app/components/icons",
        },
        null,
        2
      )
    );
  });

  it("Auto-inits React web project", async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

    (fs.readFileSync as jest.Mock).mockReturnValueOnce(
      JSON.stringify({
        dependencies: {
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        },
      })
    );

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts.mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await initializeConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_FILE_NAME),
      JSON.stringify(
        {
          platform: "web",
          outputPath: "src/components/icons",
        },
        null,
        2
      )
    );
  });

  it("Prompts for framework when package.json not found", async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false);

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "src/components/icons" });

    await initializeConfig();

    expect(mockPrompts).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "select",
        name: "platform",
      })
    );
  });
});

describe("initializeConfig()", () => {
  const mockPackageJson = {
    dependencies: {},
    devDependencies: {},
  };

  beforeEach((): void => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));
  });

  it("Installs react-native-svg and pixelarticons for React Native", async () => {
    (fs.readFileSync as jest.Mock)
      .mockReturnValueOnce(JSON.stringify({ dependencies: { "react-native": "0.70.0" } }))
      .mockReturnValueOnce(JSON.stringify({ dependencies: {} }));

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "native" })
      .mockResolvedValueOnce({ outputPath: "app/components/icons" });

    await initializeConfig();

    expect(execSync).toHaveBeenCalledWith(
      "npm install react-native-svg pixelarticons",
      expect.any(Object)
    );
  });

  it("Installs Tailwind deps and pixelarticons for React projects", async () => {
    (fs.readFileSync as jest.Mock)
      .mockReturnValueOnce(JSON.stringify({ dependencies: { react: "18.0.0" } }))
      .mockReturnValueOnce(JSON.stringify({ dependencies: {} }));

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "app/components/icons" });

    await initializeConfig();

    expect(execSync).toHaveBeenCalledWith(
      "npm install tailwind-merge tailwindcss-animate pixelarticons",
      expect.any(Object)
    );
    expect(execSync).toHaveBeenCalledWith("npm install -D tailwindcss", expect.any(Object));
  });

  it("Skips installation if dependencies already exist", async () => {
    const fullPackageJson = {
      dependencies: {
        react: "18.0.0",
        "tailwind-merge": "1.0.0",
        "tailwindcss-animate": "1.0.0",
        pixelarticons: "1.7.0",
      },
      devDependencies: {
        tailwindcss: "3.0.0",
      },
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fullPackageJson));

    const mockPrompts = prompts as unknown as jest.Mock;
    mockPrompts
      .mockResolvedValueOnce({ platform: "web" })
      .mockResolvedValueOnce({ outputPath: "app/components/icons" });

    await initializeConfig();

    expect(execSync).not.toHaveBeenCalled();
  });
});
