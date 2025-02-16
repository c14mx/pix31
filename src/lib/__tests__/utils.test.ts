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
} from "../utils";
import fs from "fs";
import { select } from "@clack/prompts";
import { DEFAULT_OUTPUT_PATH } from "../constants";

jest.mock("fs");
jest.mock("@clack/prompts", () => ({
  select: jest.fn().mockImplementation(() => Promise.resolve()),
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
  it("returns web config when user selects React", async () => {
    (select as jest.Mock).mockResolvedValue("web");

    const result = await initializeConfig();

    expect(result).toEqual({
      platform: "web",
      outputPath: DEFAULT_OUTPUT_PATH,
    });
  });

  it("returns native config when user selects React Native", async () => {
    (select as jest.Mock).mockResolvedValue("native");

    const result = await initializeConfig();

    expect(result).toEqual({
      platform: "native",
      outputPath: DEFAULT_OUTPUT_PATH,
    });
  });

  it("returns null when user declines or cancels", async () => {
    (select as jest.Mock).mockResolvedValue("no");
    expect(await initializeConfig()).toBeNull();

    (select as jest.Mock).mockResolvedValue(null);
    expect(await initializeConfig()).toBeNull();
  });
});
