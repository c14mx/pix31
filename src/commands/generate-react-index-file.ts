import fs from "fs";
import path from "path";

export async function generateIndexFile(): Promise<void> {
  const reactIconsDir = path.resolve("react-icons");
  const indexPath = path.join(reactIconsDir, "index.ts");

  // Update the HakoIcon export path
  let indexContent = `export { HakoIcon, HakoIconProps } from "../lib/hako-icon";\n\n`;

  // Get all .tsx files
  const tsxFiles = fs
    .readdirSync(reactIconsDir)
    .filter((file) => file.endsWith(".tsx"))
    .filter((file) => file !== "hako-icon.tsx");

  // Add exports for each icon
  for (const file of tsxFiles) {
    const componentName = path.basename(file, ".tsx") + "Icon";
    const importPath = "./" + path.basename(file, ".tsx");
    indexContent += `export { ${componentName} } from '${importPath}';\n`;
  }

  // Write the index file
  fs.writeFileSync(indexPath, indexContent);
  console.log(`Generated index file with ${tsxFiles.length} icon exports`);
}

// Execute the generation if this file is run directly
if (require.main === module) {
  generateIndexFile().catch(console.error);
}
