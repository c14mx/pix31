import fs from "fs";
import path from "path";
import type { SpyInstance } from "jest-mock";
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

import {
  convertNumberToWord,
  toPascalCase,
  extractSVGPath,
  findAllPathElements,
  generateReactComponent,
  generateReactNativeComponent,
  getSvgFiles,
  searchRelatedFileNames,
  calculateSimilarity,
  readConfig,
  getReactNativeExportLine,
  getReactExportLine,
  ensureIndexFile,
  appendIconExport,
  iconFileExists,
  generateIconComponent,
  printInitSuccess,
} from "@lib/utils";
import { LIB_NAME } from "@lib/constants";
import { JsonConfig, Platform } from "@lib/types";

describe("convertNumberToWord()", () => {
  it("Replaces number prefix with word", () => {
    expect(convertNumberToWord("4g")).toBe("Four-g");
    expect(convertNumberToWord("4k-box")).toBe("Four-k-box");
    expect(convertNumberToWord("5g")).toBe("Five-g");
  });

  it("Preserves strings without number prefix", () => {
    expect(convertNumberToWord("android")).toBe("android");
    expect(convertNumberToWord("align-left")).toBe("align-left");
    expect(convertNumberToWord("battery-1")).toBe("battery-1");
    expect(convertNumberToWord("battery-2")).toBe("battery-2");
    expect(convertNumberToWord("volume-3")).toBe("volume-3");
  });
});

describe("toPascalCase()", () => {
  it("Converts hyphenated strings", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld");
    expect(toPascalCase("foo-bar-baz")).toBe("FooBarBaz");
    expect(toPascalCase("some-component")).toBe("SomeComponent");
  });

  it("Handles single words", () => {
    expect(toPascalCase("hello")).toBe("Hello");
    expect(toPascalCase("world")).toBe("World");
  });

  it("Handles empty strings", () => {
    expect(toPascalCase("")).toBe("");
  });
});

describe("extractSVGPath()", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Extracts single path", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"]);
  });

  it("Extracts multiple paths", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
        <path d="M4 4h16v16H4z"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"]);
  });

  it("Returns null for SVG without paths", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <rect width="24" height="24"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toBeNull();
  });

  it("Returns null for invalid SVG", async () => {
    const svgContent = `not valid svg`;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toBeNull();

    expect(console.error).toHaveBeenCalledWith("Failed to parse SVG:", expect.any(Error));
  });
});

describe("findAllPathElements()", () => {
  it("Finds root level paths", () => {
    const node = {
      name: "svg",
      children: [
        { name: "path", attributes: { d: "M1 1h1" } },
        { name: "path", attributes: { d: "M2 2h2" } },
      ],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(2);
    expect(paths[0]?.attributes?.d).toBe("M1 1h1");
    expect(paths[1]?.attributes?.d).toBe("M2 2h2");
  });

  it("Finds nested paths", () => {
    const node = {
      name: "svg",
      children: [
        {
          name: "g",
          children: [{ name: "path", attributes: { d: "M1 1h1" } }],
        },
        { name: "path", attributes: { d: "M2 2h2" } },
      ],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(2);
    expect(paths[0]?.attributes?.d).toBe("M1 1h1");
    expect(paths[1]?.attributes?.d).toBe("M2 2h2");
  });

  it("Returns empty array when no paths", () => {
    const node = {
      name: "svg",
      children: [{ name: "rect", attributes: { width: "10", height: "10" } }],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(0);
  });

  it("Handles nodes without children", () => {
    const node = {
      name: "path",
      attributes: { d: "M1 1h1" },
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(1);
    expect(paths[0]?.attributes?.d).toBe("M1 1h1");
  });
});

describe("generateReactComponent()", () => {
  it("Generates single path component", () => {
    const componentName = "HomeIcon";
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"];

    const result = generateReactComponent(componentName, pathData);
    expect(result).toBe(`import React from 'react';
import { Icon, IconProps } from './index';

export const HomeIcon = React.forwardRef<SVGSVGElement, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill="currentColor"/>
    </Icon>
  );
}) as React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

HomeIcon.displayName = "HomeIcon";
`);
  });

  it("Generates multi-path component", () => {
    const componentName = "ComplexIcon";
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"];

    const result = generateReactComponent(componentName, pathData);
    expect(result).toBe(`import React from 'react';
import { Icon, IconProps } from './index';

export const ComplexIcon = React.forwardRef<SVGSVGElement, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill="currentColor"/>
      <path d="M4 4h16v16H4z" fill="currentColor"/>
    </Icon>
  );
}) as React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

ComplexIcon.displayName = "ComplexIcon";
`);
  });
});

describe("generateReactNativeComponent()", () => {
  it("Generates single path component", () => {
    const componentName = "HomeIcon";
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"];

    const result = generateReactNativeComponent(componentName, pathData);
    expect(result).toBe(`import React from 'react';
import { Path } from 'react-native-svg';
import { Icon, IconProps } from './index';

export const HomeIcon = React.forwardRef<any, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <Path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill={props.color ?? "currentColor"} />
    </Icon>
  );
});

HomeIcon.displayName = "HomeIcon";
`);
  });

  it("Generates multi-path component", () => {
    const componentName = "ComplexIcon";
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"];

    const result = generateReactNativeComponent(componentName, pathData);
    expect(result).toBe(`import React from 'react';
import { Path } from 'react-native-svg';
import { Icon, IconProps } from './index';

export const ComplexIcon = React.forwardRef<any, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
      <Path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill={props.color ?? "currentColor"} />
      <Path d="M4 4h16v16H4z" fill={props.color ?? "currentColor"} />
    </Icon>
  );
});

ComplexIcon.displayName = "ComplexIcon";
`);
  });

  it("Handles empty paths", () => {
    const componentName = "EmptyIcon";
    const pathData: string[] = [];

    const result = generateReactNativeComponent(componentName, pathData);
    expect(result).toBe(`import React from 'react';
import { Path } from 'react-native-svg';
import { Icon, IconProps } from './index';

export const EmptyIcon = React.forwardRef<any, IconProps>(({
  ...props
}, ref) => {
  return (
    <Icon ref={ref} {...props}>
    </Icon>
  );
});

EmptyIcon.displayName = "EmptyIcon";
`);
  });
});

describe("getSvgFiles()", () => {
  beforeEach(() => {
    jest.spyOn(fs, "readdirSync").mockImplementation(() => []);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Lists SVG files from directory", () => {
    const mockFiles = ["icon1.svg", "icon2.svg", "readme.md", "icon3.svg"];
    (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

    const result = getSvgFiles();

    const mockSvgPaths = [
      path.join(process.cwd(), "node_modules/pixelarticons/svg/icon1.svg"),
      path.join(process.cwd(), "node_modules/pixelarticons/svg/icon2.svg"),
      path.join(process.cwd(), "node_modules/pixelarticons/svg/icon3.svg"),
    ];

    expect(result).toHaveLength(3);
    expect(result).toEqual(mockSvgPaths);
  });

  it("Returns empty array when no SVGs", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(["readme.md", "package.json"]);

    const result = getSvgFiles();
    expect(result).toHaveLength(0);
  });
});

describe("searchRelatedFileNames()", () => {
  it("Finds similar names", () => {
    const fileNames = ["arrow-left", "arrow-right", "arrow-up", "menu", "home"];

    const results = searchRelatedFileNames("arrow", fileNames);
    expect(results).toHaveLength(3);
    expect(results).toContain("arrow-left");
    expect(results).toContain("arrow-right");
    expect(results).toContain("arrow-up");
  });

  it("Respects limit parameter", () => {
    const fileNames = ["arrow-left", "arrow-right", "arrow-up", "arrow-down", "arrow-circle"];

    const results = searchRelatedFileNames("arrow", fileNames, 2);
    expect(results).toHaveLength(2);
  });

  it("Filters low similarity matches", () => {
    const fileNames = ["arrow-left", "menu", "home", "settings"];

    const results = searchRelatedFileNames("arrow", fileNames);
    expect(results).toHaveLength(1);
    expect(results).toContain("arrow-left");
    expect(results).not.toContain("menu");
    expect(results).not.toContain("home");
  });

  it("Returns empty for no matches", () => {
    const fileNames = ["menu", "home", "settings"];

    const results = searchRelatedFileNames("xyz", fileNames);
    expect(results).toHaveLength(0);
  });
});

describe("calculateSimilarity()", () => {
  it("Matches substrings", () => {
    expect(calculateSimilarity("menu", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("arrow", "arrow-left")).toBe(0.8);
    expect(calculateSimilarity("home", "home-filled")).toBe(0.8);
  });

  it("Matches common words", () => {
    expect(calculateSimilarity("arrow-right", "arrow-left")).toBeCloseTo(0.65);
    expect(calculateSimilarity("menu-alt", "menu-alternative")).toBeCloseTo(0.8);
    expect(calculateSimilarity("home-filled", "home-outline")).toBeCloseTo(0.65);
  });

  it("Matches similar characters", () => {
    expect(calculateSimilarity("menu", "menue")).toBeCloseTo(0.8);
    expect(calculateSimilarity("arrow", "below")).toBeLessThan(0.5);
    expect(calculateSimilarity("home", "dome")).toBeCloseTo(0.75);
  });

  it("Handles case insensitive", () => {
    expect(calculateSimilarity("MENU", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("Arrow-Left", "arrow-left")).toBe(0.8);
    expect(calculateSimilarity("HOME", "home")).toBe(0.8);
  });

  it("Handles empty strings", () => {
    expect(calculateSimilarity("", "test")).toBe(0);
    expect(calculateSimilarity("test", "")).toBe(0);
    expect(calculateSimilarity("", "")).toBe(0);
  });
});

describe("readConfig()", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    jest.spyOn(fs, "readFileSync").mockImplementation(() => "");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Parses existing config", () => {
    const mockConfig = {
      platform: "native",
      outputPath: "src/icons",
      svgPath: "assets/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

    expect(readConfig()).toEqual(mockConfig);
  });

  it("Returns null when no config", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(readConfig()).toBeNull();
  });

  it("Returns null for invalid JSON", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue("invalid json");

    expect(readConfig()).toBeNull();
  });

  it("Returns null on read error", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Read failed");
    });

    expect(readConfig()).toBeNull();
  });
});

describe("getReactNativeExportLine()", () => {
  it("Generates export line for React Native", () => {
    expect(getReactNativeExportLine("home")).toBe('export * from "./home";');
    expect(getReactNativeExportLine("arrow-left")).toBe('export * from "./arrow-left";');
    expect(getReactNativeExportLine("4k-box")).toBe('export * from "./4k-box";');
  });
});

describe("getReactExportLine()", () => {
  it("Generates export line for React with PascalCase icon name", () => {
    expect(getReactExportLine("home")).toBe('export { HomeIcon } from "./home";');
    expect(getReactExportLine("arrow-left")).toBe('export { ArrowLeftIcon } from "./arrow-left";');
    expect(getReactExportLine("4k-box")).toBe('export { FourKBoxIcon } from "./4k-box";');
  });
});

describe("ensureIndexFile()", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Creates directory and index file for React Native", () => {
    const config: JsonConfig = {
      platform: "native" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false);

    ensureIndexFile(config);

    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(process.cwd(), "src/icons"), {
      recursive: true,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.tsx"),
      expect.stringContaining("react-native-svg")
    );
  });

  it("Creates directory and index file for React", () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false);

    ensureIndexFile(config);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.tsx"),
      expect.not.stringContaining("react-native-svg")
    );
  });

  it("Skips creation if index file exists", () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    ensureIndexFile(config);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("appendIconExport()", () => {
  const nativeConfig: JsonConfig = {
    platform: "native" as Platform,
    outputPath: "src/icons",
  };

  const reactConfig: JsonConfig = {
    platform: "react" as Platform,
    outputPath: "src/icons",
  };

  beforeEach(() => {
    jest.spyOn(fs, "readFileSync").mockImplementation(() => "");
    jest.spyOn(fs, "appendFileSync").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Appends React Native export if not exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue("existing content");

    appendIconExport(nativeConfig, "home");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.tsx"),
      '\nexport * from "./home";\n'
    );
  });

  it("Appends React export if not exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue("existing content");

    appendIconExport(reactConfig, "home");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.tsx"),
      '\nexport { HomeIcon } from "./home";\n'
    );
  });

  it("Skips if export already exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('export { HomeIcon } from "./home";');

    appendIconExport(reactConfig, "home");

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });
});

describe("iconFileExists()", () => {
  const config: JsonConfig = {
    platform: "react" as Platform,
    outputPath: "src/icons",
  };

  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation(() => false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Returns true when icon file exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    expect(iconFileExists(config, "home")).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith(path.join(process.cwd(), "src/icons/home.tsx"));
  });

  it("Returns false when icon file doesn't exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(iconFileExists(config, "nonexistent")).toBe(false);
  });
});

describe("generateIconComponent()", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    jest.spyOn(fs, "readFileSync").mockImplementation(() => "");
    jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    jest.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("Generates React component", async () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
      </svg>
    `);

    const result = await generateIconComponent(config, "home", "path/to/home.svg");

    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/home.tsx"),
      expect.stringContaining("HomeIcon")
    );
  });

  it("Generates React Native component", async () => {
    const config: JsonConfig = {
      platform: "native" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
      </svg>
    `);

    const result = await generateIconComponent(config, "home", "path/to/home.svg");

    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/home.tsx"),
      expect.stringContaining("<Path")
    );
  });

  it("Throws on missing paths", async () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <rect width="24" height="24"/>
      </svg>
    `);

    await expect(generateIconComponent(config, "home", "path/to/home.svg")).rejects.toThrow(
      "Failed to extract path data from home"
    );
  });
});

describe("printInitSuccess()", () => {
  let consoleLogSpy: SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("Prints formatted success message with chalk colors", () => {
    printInitSuccess();

    expect(consoleLogSpy).toHaveBeenCalledTimes(5);
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("--------------------------------")
    );
    expect(consoleLogSpy).toHaveBeenNthCalledWith(2, expect.any(String), "Commands you can run:");
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      3,
      expect.any(String),
      `npx ${LIB_NAME} browse                     Search pixelarticons website`
    );
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      4,
      expect.any(String),
      `npx ${LIB_NAME} add [icon-1] [icon-2] ...  Add icons to your project`
    );
    expect(consoleLogSpy).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("--------------------------------")
    );
  });
});
