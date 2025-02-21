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
} from "./utils";
import fs from "fs";
import path from "path";
import { JsonConfig, Platform } from "./types";

describe("convertNumberToWord(): ", () => {
  it("Replaces number prefix with NUMBER_WORDS", () => {
    expect(convertNumberToWord("4g")).toBe("Four-g");
    expect(convertNumberToWord("4k-box")).toBe("Four-k-box");
    expect(convertNumberToWord("5g")).toBe("Five-g");
  });

  it("Keeps original string if there is no number prefix", () => {
    expect(convertNumberToWord("android")).toBe("android");
    expect(convertNumberToWord("align-left")).toBe("align-left");
    expect(convertNumberToWord("battery-1")).toBe("battery-1");
    expect(convertNumberToWord("battery-2")).toBe("battery-2");
    expect(convertNumberToWord("volume-3")).toBe("volume-3");
  });
});

describe("toPascalCase(): ", () => {
  it("converts hyphenated strings to PascalCase", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld");
    expect(toPascalCase("foo-bar-baz")).toBe("FooBarBaz");
    expect(toPascalCase("some-component")).toBe("SomeComponent");
  });

  it("handles single word strings", () => {
    expect(toPascalCase("hello")).toBe("Hello");
    expect(toPascalCase("world")).toBe("World");
  });

  it("handles empty strings", () => {
    expect(toPascalCase("")).toBe("");
  });
});

describe("extractSVGPath(): ", () => {
  // Mock console.error before tests
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // Restore console.error after tests
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("extracts single path from SVG", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"]);
  });

  it("extracts multiple paths from SVG", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
        <path d="M4 4h16v16H4z"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"]);
  });

  it("returns null for SVG without paths", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
        <rect width="24" height="24"/>
      </svg>
    `;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toBeNull();
  });

  it("returns null for invalid SVG", async () => {
    const svgContent = `not valid svg`;
    const paths = await extractSVGPath(svgContent);
    expect(paths).toBeNull();
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith("Failed to parse SVG:", expect.any(Error));
  });
});

describe("findAllPathElements(): ", () => {
  it("finds path elements at root level", () => {
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

  it("finds nested path elements", () => {
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

  it("returns empty array when no paths found", () => {
    const node = {
      name: "svg",
      children: [{ name: "rect", attributes: { width: "10", height: "10" } }],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(0);
  });

  it("handles nodes without children", () => {
    const node = {
      name: "path",
      attributes: { d: "M1 1h1" },
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(1);
    expect(paths[0]?.attributes?.d).toBe("M1 1h1");
  });
});

describe("generateReactComponent(): ", () => {
  it("generates component with single path", () => {
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

  it("generates component with multiple paths", () => {
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

describe("generateReactNativeComponent(): ", () => {
  it("generates component with single path", () => {
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

  it("generates component with multiple paths", () => {
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

  it("handles empty path data", () => {
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

describe("getSvgFiles(): ", () => {
  beforeEach(() => {
    jest.spyOn(fs, "readdirSync").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns list of SVG files from pixelarticons directory", () => {
    const mockFiles = ["icon1.svg", "icon2.svg", "readme.md", "icon3.svg"];
    (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

    const result = getSvgFiles();

    // Verify it filters non-svg files and returns full paths
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      path.join(__dirname, "../../pixelarticons/icon1.svg"),
      path.join(__dirname, "../../pixelarticons/icon2.svg"),
      path.join(__dirname, "../../pixelarticons/icon3.svg"),
    ]);
  });

  it("returns empty array when no SVG files exist", () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(["readme.md", "package.json"]);

    const result = getSvgFiles();
    expect(result).toHaveLength(0);
  });
});

describe("searchRelatedFileNames(): ", () => {
  it("finds related file names based on similarity", () => {
    const fileNames = ["arrow-left", "arrow-right", "arrow-up", "menu", "home"];

    const results = searchRelatedFileNames("arrow", fileNames);
    expect(results).toHaveLength(3);
    expect(results).toContain("arrow-left");
    expect(results).toContain("arrow-right");
    expect(results).toContain("arrow-up");
  });

  it("respects limit parameter", () => {
    const fileNames = ["arrow-left", "arrow-right", "arrow-up", "arrow-down", "arrow-circle"];

    const results = searchRelatedFileNames("arrow", fileNames, 2);
    expect(results).toHaveLength(2);
  });

  it("filters out low similarity matches", () => {
    const fileNames = ["arrow-left", "menu", "home", "settings"];

    const results = searchRelatedFileNames("arrow", fileNames);
    expect(results).toHaveLength(1);
    expect(results).toContain("arrow-left");
    expect(results).not.toContain("menu");
    expect(results).not.toContain("home");
  });

  it("returns empty array when no matches found", () => {
    const fileNames = ["menu", "home", "settings"];

    const results = searchRelatedFileNames("xyz", fileNames);
    expect(results).toHaveLength(0);
  });
});

describe("calculateSimilarity(): ", () => {
  it("returns high similarity for substring matches", () => {
    expect(calculateSimilarity("menu", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("arrow", "arrow-left")).toBe(0.8);
    expect(calculateSimilarity("home", "home-filled")).toBe(0.8);
  });

  it("returns partial similarity for common words in hyphenated strings", () => {
    expect(calculateSimilarity("arrow-right", "arrow-left")).toBeCloseTo(0.65);
    expect(calculateSimilarity("menu-alt", "menu-alternative")).toBeCloseTo(0.8);
    expect(calculateSimilarity("home-filled", "home-outline")).toBeCloseTo(0.65);
  });

  it("returns character-based similarity for strings with no common words", () => {
    expect(calculateSimilarity("menu", "menue")).toBeCloseTo(0.8);
    expect(calculateSimilarity("arrow", "below")).toBeLessThan(0.5);
    expect(calculateSimilarity("home", "dome")).toBeCloseTo(0.75);
  });

  it("handles case insensitive comparison", () => {
    expect(calculateSimilarity("MENU", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("Arrow-Left", "arrow-left")).toBe(0.8);
    expect(calculateSimilarity("HOME", "home")).toBe(0.8);
  });

  it("handles empty strings", () => {
    expect(calculateSimilarity("", "test")).toBe(0);
    expect(calculateSimilarity("test", "")).toBe(0);
    expect(calculateSimilarity("", "")).toBe(0);
  });
});

describe("readConfig(): ", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation();
    jest.spyOn(fs, "readFileSync").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns parsed config when file exists", () => {
    const mockConfig = {
      platform: "native",
      outputPath: "src/icons",
      svgPath: "assets/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

    expect(readConfig()).toEqual(mockConfig);
  });

  it("returns null when config file doesn't exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(readConfig()).toBeNull();
  });

  it("returns null when config file is invalid JSON", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue("invalid json");

    expect(readConfig()).toBeNull();
  });

  it("returns null when read operation fails", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Read failed");
    });

    expect(readConfig()).toBeNull();
  });
});

describe("getReactNativeExportLine(): ", () => {
  it("generates export line for React Native", () => {
    expect(getReactNativeExportLine("home")).toBe('export * from "./home";');
    expect(getReactNativeExportLine("arrow-left")).toBe('export * from "./arrow-left";');
    expect(getReactNativeExportLine("4k-box")).toBe('export * from "./4k-box";');
  });
});

describe("getReactExportLine(): ", () => {
  it("generates export line for React with PascalCase icon name", () => {
    expect(getReactExportLine("home")).toBe('export { HomeIcon } from "./home";');
    expect(getReactExportLine("arrow-left")).toBe('export { ArrowLeftIcon } from "./arrow-left";');
    expect(getReactExportLine("4k-box")).toBe('export { FourKBoxIcon } from "./4k-box";');
  });
});

describe("ensureIndexFile(): ", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation();
    jest.spyOn(fs, "mkdirSync").mockImplementation();
    jest.spyOn(fs, "writeFileSync").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates directory and index file for React Native", () => {
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
      path.join(process.cwd(), "src/icons/index.ts"),
      expect.stringContaining("react-native-svg")
    );
  });

  it("creates directory and index file for React", () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false);

    ensureIndexFile(config);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.ts"),
      expect.not.stringContaining("react-native-svg")
    );
  });

  it("skips creation if index file exists", () => {
    const config: JsonConfig = {
      platform: "react" as Platform,
      outputPath: "src/icons",
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    ensureIndexFile(config);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("appendIconExport(): ", () => {
  const nativeConfig: JsonConfig = {
    platform: "native" as Platform,
    outputPath: "src/icons",
  };

  const reactConfig: JsonConfig = {
    platform: "react" as Platform,
    outputPath: "src/icons",
  };

  beforeEach(() => {
    jest.spyOn(fs, "readFileSync").mockImplementation();
    jest.spyOn(fs, "appendFileSync").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("appends React Native export if not exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue("existing content");

    appendIconExport(nativeConfig, "home");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.ts"),
      '\nexport * from "./home";\n'
    );
  });

  it("appends React export if not exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue("existing content");

    appendIconExport(reactConfig, "home");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "src/icons/index.ts"),
      '\nexport { HomeIcon } from "./home";\n'
    );
  });

  it("skips if export already exists", () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('export { HomeIcon } from "./home";');

    appendIconExport(reactConfig, "home");

    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });
});

describe("iconFileExists(): ", () => {
  const config: JsonConfig = {
    platform: "react" as Platform,
    outputPath: "src/icons",
  };

  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true when icon file exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    expect(iconFileExists(config, "home")).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith(path.join(process.cwd(), "src/icons/home.tsx"));
  });

  it("returns false when icon file doesn't exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(iconFileExists(config, "nonexistent")).toBe(false);
  });
});

describe("generateIconComponent(): ", () => {
  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockImplementation();
    jest.spyOn(fs, "readFileSync").mockImplementation();
    jest.spyOn(fs, "mkdirSync").mockImplementation();
    jest.spyOn(fs, "writeFileSync").mockImplementation();
    jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("generates new React component successfully", async () => {
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

  it("generates new React Native component successfully", async () => {
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

  it("throws error when SVG has no paths", async () => {
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
