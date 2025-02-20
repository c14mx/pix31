import {
  convertNumberToWord,
  formatSvgFileNameToPascalCase,
  generateReactComponent,
  generateReactNativeComponent,
  toPascalCase,
  extractSVGPath,
  findAllPathElements,
  searchRelatedFileNames,
  calculateSimilarity,
  readConfig,
  initializeConfig,
  getReactNativeExportLine,
  getReactExportLine,
  generateReactIcons,
  generateIndexFile,
} from "./utils";
import fs from "fs";
import { select, text } from "@clack/prompts";
import { DEFAULT_OUTPUT_PATH } from "./constants";
import path from "path";

jest.mock("fs");
jest.mock("@clack/prompts", () => ({
  select: jest.fn(),
  text: jest.fn(),
}));

jest.mock("../constants", () => ({
  ...jest.requireActual("../constants"),
  REACT_INDEX_TEMPLATE: "",
  REACT_NATIVE_INDEX_TEMPLATE: "",
}));

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
  it("Converts string to PascalCase", () => {
    expect(toPascalCase("Four-g")).toBe("FourG");
    expect(toPascalCase("Four-k-box")).toBe("FourKBox");
    expect(toPascalCase("Five-g")).toBe("FiveG");
    expect(toPascalCase("android")).toBe("Android");
    expect(toPascalCase("align-left")).toBe("AlignLeft");
    expect(toPascalCase("battery-1")).toBe("Battery1");
    expect(toPascalCase("volume-3")).toBe("Volume3");
  });

  it("handles empty or invalid input", () => {
    expect(toPascalCase("")).toBe("");
    expect(toPascalCase(undefined as any)).toBe("");
    expect(toPascalCase(null as any)).toBe("");
  });
});

describe("formatSvgFileNameToPascalCase(): ", () => {
  it("Formats svg file names to number-safe PascalCase", () => {
    expect(formatSvgFileNameToPascalCase("4g.svg")).toBe("FourG");
    expect(formatSvgFileNameToPascalCase("4k-box.svg")).toBe("FourKBox");
    expect(formatSvgFileNameToPascalCase("5g.svg")).toBe("FiveG");
    expect(formatSvgFileNameToPascalCase("android.svg")).toBe("Android");
    expect(formatSvgFileNameToPascalCase("align-left.svg")).toBe("AlignLeft");
  });
});

describe("extractSVGPath(): ", () => {
  it("Extracts path data from SVG with single path", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
      </svg>
    `;
    const result = await extractSVGPath(svgContent);
    expect(result).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"]);
  });

  it("Extracts all paths separately when multiple paths exist", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
        <path d="M4 4h16v16H4z"/>
      </svg>
    `;
    const result = await extractSVGPath(svgContent);
    expect(result).toEqual(["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"]);
  });

  it("Extracts nested paths", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g>
          <path d="M1 1h1v1h-1z"/>
          <g>
            <path d="M2 2h2v2h-2z"/>
          </g>
        </g>
      </svg>
    `;
    const result = await extractSVGPath(svgContent);
    expect(result).toEqual(["M1 1h1v1h-1z", "M2 2h2v2h-2z"]);
  });

  it("Returns null when no path element exists", async () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100"/>
      </svg>
    `;
    const result = await extractSVGPath(svgContent);
    expect(result).toBeNull();
  });
});

describe("findAllPathElements(): ", () => {
  it("Finds path at root level", () => {
    const node = {
      name: "svg",
      children: [{ name: "path", attributes: { d: "M1 1h1v1h-1z" } }],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(1);
    expect(paths[0].attributes.d).toBe("M1 1h1v1h-1z");
  });

  it("Finds multiple paths at different nesting levels", () => {
    const node = {
      name: "svg",
      children: [
        { name: "path", attributes: { d: "M1 1h1v1h-1z" } },
        {
          name: "g",
          children: [
            { name: "path", attributes: { d: "M2 2h2v2h-2z" } },
            {
              name: "g",
              children: [{ name: "path", attributes: { d: "M3 3h3v3h-3z" } }],
            },
          ],
        },
      ],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(3);
    expect(paths.map((p) => p.attributes.d)).toEqual([
      "M1 1h1v1h-1z",
      "M2 2h2v2h-2z",
      "M3 3h3v3h-3z",
    ]);
  });

  it("Returns empty array when no paths exist", () => {
    const node = {
      name: "svg",
      children: [
        { name: "rect", attributes: { width: "100", height: "100" } },
        {
          name: "g",
          children: [{ name: "circle", attributes: { r: "50" } }],
        },
      ],
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(0);
  });

  it("Handles node without children", () => {
    const node = {
      name: "rect",
      attributes: { width: "100", height: "100" },
    };

    const paths = findAllPathElements(node);
    expect(paths).toHaveLength(0);
  });
});

describe("generateReactNativeComponent(): ", () => {
  it("Generates component with single path", () => {
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"];
    const result = generateReactNativeComponent("HomeIcon", pathData);

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

  it("Generates component with multiple paths", () => {
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"];
    const result = generateReactNativeComponent("ComplexIcon", pathData);

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
});

describe("generateReactComponent(): ", () => {
  it("Generates component with single path", () => {
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"];
    const result = generateReactComponent("HomeIcon", pathData);

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

  it("Generates component with multiple paths", () => {
    const pathData = ["M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z", "M4 4h16v16H4z"];
    const result = generateReactComponent("ComplexIcon", pathData);

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

describe("searchRelatedFileNames(): ", () => {
  const testFiles = [
    "chevron-down",
    "chevron-up",
    "chevron-left",
    "arrow-down",
    "menu-alt",
    "menu",
  ];

  it("finds exact matches", () => {
    const results = searchRelatedFileNames("menu", testFiles);
    expect(results).toContain("menu");
  });

  it("finds partial matches", () => {
    const results = searchRelatedFileNames("chevron", testFiles);
    expect(results).toContain("chevron-down");
    expect(results).toContain("chevron-up");
    expect(results).toContain("chevron-left");
  });

  it("finds similar matches", () => {
    const results = searchRelatedFileNames("menue", testFiles);
    expect(results).toContain("menu");
  });

  it("limits results to specified number", () => {
    const results = searchRelatedFileNames("chevron", testFiles, 2);
    expect(results.length).toBe(2);
  });

  it("returns empty array for no matches", () => {
    const results = searchRelatedFileNames("xyz123", testFiles);
    expect(results).toHaveLength(0);
  });

  it("handles hyphenated queries", () => {
    const results = searchRelatedFileNames("menu-alternative", testFiles);
    expect(results).toContain("menu-alt");
  });

  it("handles similar icon variations", () => {
    const testIconFiles = [
      "arrow-left",
      "arrow-left-circle",
      "arrow-left-square",
      "double-arrow-left",
      "chevron-left",
    ];

    const results = searchRelatedFileNames("arrow-left", testIconFiles);
    expect(results).toContain("arrow-left");
    expect(results).toContain("arrow-left-circle");
    expect(results).toContain("arrow-left-square");
    expect(results).not.toContain("chevron-left");
  });
});

describe("calculateSimilarity(): ", () => {
  it("returns high similarity for substring matches", () => {
    expect(calculateSimilarity("menu", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("arrow", "arrow-left")).toBe(0.8);
  });

  it("returns partial similarity for common words in hyphenated strings", () => {
    expect(calculateSimilarity("arrow-right", "arrow-left")).toBeCloseTo(0.65);
    expect(calculateSimilarity("menu-alt", "menu-alternative")).toBeCloseTo(0.8);
  });

  it("returns character-based similarity for strings with no common words", () => {
    expect(calculateSimilarity("menu", "menue")).toBeCloseTo(0.8);
    expect(calculateSimilarity("arrow", "below")).toBeLessThan(0.5);
  });

  it("handles case insensitive comparison", () => {
    expect(calculateSimilarity("MENU", "menu-alt")).toBe(0.8);
    expect(calculateSimilarity("Arrow-Left", "arrow-left")).toBe(0.8);
  });
});

describe("readConfig(): ", () => {
  it("returns parsed config when file exists", () => {
    const mockConfig = {
      platform: "web",
      outputPath: "src/components/icons",
    };

    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockConfig));

    expect(readConfig()).toEqual(mockConfig);
  });

  it("returns null when config file doesn't exist", () => {
    fs.existsSync = jest.fn().mockReturnValue(false);

    expect(readConfig()).toBeNull();
  });
});

describe("initializeConfig(): ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fs functions
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it("creates web config with custom output path", async () => {
    (select as jest.Mock).mockResolvedValue("web");
    (text as jest.Mock).mockResolvedValue("custom/path");

    const config = await initializeConfig();

    expect(config).toEqual({
      platform: "web",
      outputPath: "custom/path",
    });
  });

  it("creates native config with default output path", async () => {
    (select as jest.Mock).mockResolvedValue("native");
    (text as jest.Mock).mockResolvedValue(DEFAULT_OUTPUT_PATH);

    const config = await initializeConfig();

    expect(config).toEqual({
      platform: "native",
      outputPath: DEFAULT_OUTPUT_PATH,
    });
  });

  it("returns null when user cancels platform selection", async () => {
    (select as jest.Mock).mockResolvedValue("cancel");
    
    const config = await initializeConfig();
    
    expect(config).toBeNull();
  });

  it("returns null when user cancels output path selection", async () => {
    (select as jest.Mock).mockResolvedValue("web");
    (text as jest.Mock).mockResolvedValue(null);
    
    const config = await initializeConfig();
    
    expect(config).toBeNull();
  });
});

describe("getReactNativeExportLine(): ", () => {
  it("Returns the export line for React Native", async () => {
    expect(getReactNativeExportLine("home")).toBe(`export * from "./home";`);
  })

  it("Does not format icon name string", async () => {
    expect(getReactNativeExportLine("abc-123-789")).toBe(`export * from "./abc-123-789";`);
  })
})

describe("getReactExportLine(): ", () => {
  it("Returns the export line for React", async () => {
    const iconName = "radio-tower";
    const formattedIconName = `${toPascalCase(iconName)}Icon`;
    expect(getReactExportLine(iconName)).toBe(`export { ${formattedIconName} } from "./${iconName}";`);
  })
})

describe("generateReactIcons(): ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully generates React components from SVG files", async () => {
    // Mock file system operations
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.readdirSync = jest.fn().mockReturnValue(["icon1.svg", "icon2.svg"]);
    fs.readFileSync = jest.fn().mockReturnValue('<svg><path d="M1 1h1v1h-1z"/></svg>');
    fs.writeFileSync = jest.fn();

    const stats = await generateReactIcons();

    expect(stats).toEqual({
      totalFiles: 2,
      successfulFiles: 2,
      failedFiles: [],
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it("handles failures during component generation", async () => {
    // Mock file system operations with one failing file
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.readdirSync = jest.fn().mockReturnValue(["valid.svg", "invalid.svg"]);
    fs.readFileSync = jest.fn().mockImplementation((filePath) => {
      if (filePath.includes("invalid.svg")) {
        return '<svg><rect width="100" height="100"/></svg>'; // No path element
      }
      return '<svg><path d="M1 1h1v1h-1z"/></svg>';
    });
    fs.writeFileSync = jest.fn();

    const stats = await generateReactIcons();

    expect(stats).toEqual({
      totalFiles: 2,
      successfulFiles: 1,
      failedFiles: ["invalid.svg"],
    });
  });

  it("creates output directory if it doesn't exist", async () => {
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.readdirSync = jest.fn().mockReturnValue([]);
    
    await generateReactIcons();

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.resolve("react-icons"),
      { recursive: true }
    );
  });
});

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