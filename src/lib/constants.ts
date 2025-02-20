import { Platform, JsonConfig } from "./types";

export const LIB_NAME = "pix31";
export const PIXELARTICONS_URL = "https://pixelarticons.com/";

export const NUMBER_WORDS: { [key: string]: string } = {
  "0": "Zero-",
  "1": "One-",
  "2": "Two-",
  "3": "Three-",
  "4": "Four-",
  "5": "Five-",
  "6": "Six-",
  "7": "Seven-",
  "8": "Eight-",
  "9": "Nine-",
};

export const PLATFORMS: Record<Platform, string> = {
  native: "React Native",
  web: "React",
};

export const DEFAULT_WEB_CONFIG: JsonConfig = {
  platform: "web",
  outputPath: "src/components/icons",
};

export const DEFAULT_NATIVE_CONFIG: JsonConfig = {
  platform: "native",
  outputPath: "src/components/icons",
};

export const CONFIG_FILE_NAME = `${LIB_NAME}.json`;
export const INDEX_FILE_NAME = "index.tsx";
export const DEFAULT_OUTPUT_PATH = "src/components/icons";

export const REACT_INDEX_TEMPLATE = `import React from "react";
import { cn } from "@lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn(className)}
        {...props}
      />
    );
  }
);

Icon.displayName = "Icon";
`;

export const REACT_NATIVE_INDEX_TEMPLATE = `import React from "react";
import Svg, { SvgProps } from "react-native-svg";

export interface IconProps extends SvgProps {
  size?: number;
}

export const Icon = React.forwardRef<Svg, IconProps>(
  ({ size = 24, width, height, viewBox = "0 0 24 24", ...props }, ref) => {
    return (
      <Svg 
        ref={ref} 
        width={width ?? size} 
        height={height ?? size} 
        viewBox={viewBox} 
        {...props} 
      />
    );
  }
);

Icon.displayName = "Icon";
`;
