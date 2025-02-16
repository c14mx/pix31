import { intro, select, outro } from "@clack/prompts";
import * as fs from "fs";
import * as path from "path";
import terminalImage from "term-img";

import { getSvgFiles } from "../lib/utils";

export async function listCommand() {
  intro("Hako Icon Browser");

  const svgFiles = getSvgFiles();

  const choices = svgFiles.map((file) => {
    const name = path.basename(file, ".svg");
    const svgContent = fs.readFileSync(file, "utf-8");
    // Modify SVG for preview (12x12)
    const previewSvg = svgContent
      .replace(/width="[^"]*"/, 'width="12"')
      .replace(/height="[^"]*"/, 'height="12"');

    let hintStr: string;
    try {
      hintStr = terminalImage(previewSvg, {
        width: "12",
        height: "12",
        fallback: "🎨",
      });
    } catch {
      hintStr = "🎨";
    }

    return {
      value: file,
      label: name,
      hint: hintStr,
    };
  });

  const selected = await select({
    message: "Select an icon to preview",
    options: choices,
  });

  if (selected) {
    const svgContent = fs.readFileSync(selected as string, "utf-8");
    // Show larger preview (64x64)
    const previewSvg = svgContent
      .replace(/width="[^"]*"/, 'width="64"')
      .replace(/height="[^"]*"/, 'height="64"');

    console.log("\nSelected Icon (64x64):");
    try {
      terminalImage(previewSvg, {
        width: "64",
        height: "64",
        fallback: "(SVG preview not available in this terminal)",
      });
    } catch {
      console.log("(SVG preview not available in this terminal)");
    }
    console.log(`\nFile: ${path.basename(selected as string)}`);
  }

  outro("Thanks for using Hako!");
}
