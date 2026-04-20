import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createRequestHandler = vi.fn(() => vi.fn());

vi.mock("react-router", () => ({
  createRequestHandler,
}));

(vi.mock as (...args: unknown[]) => void)(
  "virtual:react-router/server-build",
  () => ({
    default: {},
  }),
  { virtual: true },
);

describe("APP_HOSTS", () => {
  const originalHosts = process.env.HANLEC_APP_HOSTS;

  beforeEach(() => {
    createRequestHandler.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalHosts == null) {
      delete process.env.HANLEC_APP_HOSTS;
    } else {
      process.env.HANLEC_APP_HOSTS = originalHosts;
    }
  });

  it("defaults to wildcard when HANLEC_APP_HOSTS is not set", async () => {
    delete process.env.HANLEC_APP_HOSTS;

    await import("./server.js");

    expect(createRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedActionOrigins: ["**"],
      }),
    );
  });

  it("uses HANLEC_APP_HOSTS when it is set", async () => {
    process.env.HANLEC_APP_HOSTS = JSON.stringify([
      "https://app.example.com",
      "https://admin.example.com",
    ]);

    await import("./server.js");

    expect(createRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedActionOrigins: [
          "https://app.example.com",
          "https://admin.example.com",
        ],
      }),
    );
  });
});
