import { jest } from "@jest/globals";
import { browse } from "./command";
import { PIXELARTICONS_URL } from "./lib/constants";

jest.mock("open", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve()),
}));

import open from "open";

describe("browse command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens pixelarticons website in default browser", async () => {
    await browse();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(PIXELARTICONS_URL);
  });

  it("handles browser open errors gracefully", async () => {
    const mockError = new Error("Failed to open browser");
    (open as jest.Mock).mockRejectedValueOnce(mockError);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    await browse();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error"), mockError);
  });

  // 5. Test with different URLs (if supported)
  it("opens correct URL based on environment", async () => {
    // Example: If you have different URLs for different environments
    process.env.ICON_LIBRARY_URL = "https://custom-icons.com";

    await browse();

    expect(open).toHaveBeenCalledWith(PIXELARTICONS_URL); // or process.env.ICON_LIBRARY_URL

    delete process.env.ICON_LIBRARY_URL;
  });

  // 6. Test command options (if any are added in the future)
  it("supports opening specific icon category", async () => {
    // Example: If you add category support in the future
    await browse({ category: "arrows" });

    expect(open).toHaveBeenCalledWith(expect.stringContaining(PIXELARTICONS_URL));
  });
});
