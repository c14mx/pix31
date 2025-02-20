import open from "open";

export async function browse(): Promise<void> {
  await open("https://pixelarticons.com/");
} 