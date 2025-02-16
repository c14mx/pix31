export interface GenerationStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: string[];
}

export interface AddCLIOptions {
  web?: boolean;
  native?: boolean;
}
