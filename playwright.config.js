import { defineConfig } from "@playwright/test";
const liveURL = process.env.PLAYPIKU_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: liveURL || "http://127.0.0.1:4173/playpiku/",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
      proxy:
        liveURL && process.env.HTTPS_PROXY
          ? { server: process.env.HTTPS_PROXY }
          : undefined,
    },
    screenshot: "only-on-failure",
  },
  webServer: liveURL
    ? undefined
    : {
        command: "node scripts/serve.js",
        port: 4173,
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
