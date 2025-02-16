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
