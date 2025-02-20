import { jest } from "@jest/globals";
import { browse } from "./command";
import { PIXELARTICONS_URL, LIB_NAME } from "../../lib/constants";

jest.mock("open", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve()),
}));

import open from "open";

describe(`npx ${LIB_NAME} browse`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Opens pixelarticons site", async () => {
    await browse();

    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(PIXELARTICONS_URL);
  });
});
