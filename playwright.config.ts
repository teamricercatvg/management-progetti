import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3106",
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node tests/ui/auth-fixture.mjs",
      url: "http://127.0.0.1:54329",
      reuseExistingServer: false,
    },
    {
      command: process.env.UI_PRODUCTION === "1" ? "npm run start -- --port 3106" : "npm run dev -- --port 3106",
      url: "http://127.0.0.1:3106/login",
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-ui-fixture",
        APP_URL: "http://127.0.0.1:3106",
      },
    },
  ],
});
