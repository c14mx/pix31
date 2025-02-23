export interface GenerationStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: string[];
}

export interface AddCLIOptions {
  web?: boolean;
  native?: boolean;
}

export interface IconConfig {
  platform: Platform;
  input: string;
  output: {
    path: string;
    componentName: string;
  };
}

export type Platform = "web" | "native";

export interface JsonConfig {
  platform: Platform;
  outputPath: string;
}

export interface SVGNode {
  name: string;
  attributes?: Record<string, string>;
  children?: SVGNode[];
}

export type SpinnerMock = {
  start: () => SpinnerMock;
  stop: () => SpinnerMock;
  success: (options?: { text?: string }) => SpinnerMock;
  error: (options?: { text?: string }) => SpinnerMock;
  warn: (options?: { text?: string }) => SpinnerMock;
};
