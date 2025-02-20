import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import pino from "pino";

const logger = pino({
  transport: undefined,
  level: "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

interface ScrapingStats {
  totalFetched: number;
  totalCreated: number;
  failedSvgs: string[];
}

async function scrapeIcons(): Promise<ScrapingStats> {
  const stats: ScrapingStats = {
    totalFetched: 0,
    totalCreated: 0,
    failedSvgs: [],
  };

  try {
    // Create pixelarticons directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "pixelarticons");
    await fs.ensureDir(outputDir);

    logger.info("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    logger.info("Navigating to pixelarticons.com...");
    await page.goto("https://pixelarticons.com/", { waitUntil: "networkidle0" });

    // Wait for the grid to load
    await page.waitForSelector(".grid.grid-cols-5");

    const icons = await page.evaluate(() => {
      const root = document.querySelector(".grid.grid-cols-5");
      if (!root) return [];

      return Array.from(root.children).map((child) => ({
        name: child.children[1]?.textContent?.trim() || "",
        svg: child.children[0]?.outerHTML || "",
      }));
    });

    stats.totalFetched = icons.length;
    logger.info(`Found ${icons.length} icons`);

    // Process each icon
    for (const icon of icons) {
      try {
        if (!icon.name || !icon.svg) {
          throw new Error("Missing name or SVG content");
        }

        const filePath = path.join(outputDir, `${icon.name}.svg`);
        await fs.writeFile(filePath, icon.svg);
        stats.totalCreated++;
        logger.info(`Created ${icon.name}.svg`);
      } catch (error) {
        stats.failedSvgs.push(icon.name);
        logger.error(`Failed to process icon: ${icon.name}`);
      }
    }

    await browser.close();
  } catch (error) {
    logger.error("Script failed:", error);
  }

  return stats;
}

async function main() {
  logger.info("Starting icon scraping...");

  const stats = await scrapeIcons();

  logger.info("\nScraping completed!");
  logger.info("Summary:");
  logger.info(`Total SVGs fetched: ${stats.totalFetched}`);
  logger.info(`Total SVG files created: ${stats.totalCreated}`);
  logger.info(`Total SVGs failed: ${stats.failedSvgs.length}`);

  if (stats.failedSvgs.length > 0) {
    logger.info("\nFailed SVGs:");
    stats.failedSvgs.forEach((name) => logger.info(`- ${name}`));
  }
}

main().catch((error) => {
  logger.error("Script failed:", error);
  process.exit(1);
});
