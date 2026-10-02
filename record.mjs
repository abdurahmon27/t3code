import { chromium } from "node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs";
import { readFileSync, mkdirSync, renameSync } from "node:fs";
const E = "/tmp/t3-pill-evidence";
const label = process.argv[2];
const out = E + "/" + label;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "google-chrome-stable", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: E + "/state.json",
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page = await ctx.newPage();
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5) + "s", ...a);
const pillText = async () => {
  const body = await page.locator("body").innerText();
  const hits = [/Updating Claude/, /Claude updated[^\n]*/, /update failed/, /still needs an update/].map((r) => body.match(r)?.[0]).filter(Boolean);
  return hits.join(" + ") || "(no pill text)";
};
await page.goto("http://localhost:5733/settings/providers");
await page.getByText("Claude Work").first().waitFor({ timeout: 90000 });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Select Claude Work" }).click();
await page.waitForTimeout(1500);
// The "Update Available" toast covers the instance header; close it, then open
// the Claude Work version popover from the instance panel.
await page.getByRole("button", { name: "Dismiss notification" }).click();
await page.waitForTimeout(800);
await page.getByText("v2.1.286").last().locator("xpath=following-sibling::span//button").first().click();
await page.waitForTimeout(800);
const install = page.getByRole("button", { name: /Install v2\.1\.287|Update now/ });
await install.first().waitFor({ timeout: 15000 });
await page.screenshot({ path: out + "/1-settings-before-click.png" });
log("clicking", await install.first().innerText(), "on the Claude Work instance");
await install.first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: out + "/2-settings-updating.png" });
await page.getByText("Back", { exact: true }).click();
await page.waitForTimeout(2500);
log("back in chat sidebar:", await pillText());
await page.screenshot({ path: out + "/3-sidebar-during-update.png" });
let last = "";
let shotDone = false;
for (let i = 0; i < 60; i++) {
  const text = await pillText();
  if (text !== last) { log("pill:", text); last = text; }
  const version = readFileSync(E + "/home/.local/bin/fake-version", "utf8").trim();
  if (version === "2.1.287" && !shotDone && (/updated/.test(text) || i > 40)) {
    await page.screenshot({ path: out + "/4-sidebar-after-update.png" });
    shotDone = true;
  }
  if (version === "2.1.287" && i > 44) break;
  await page.waitForTimeout(500);
}
if (!shotDone) await page.screenshot({ path: out + "/4-sidebar-after-update.png" });
log("fake CLI version now", readFileSync(E + "/home/.local/bin/fake-version", "utf8").trim());
await page.goto("http://localhost:5733/settings/providers");
await page.getByText("Claude Work").first().waitFor({ timeout: 90000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: out + "/5-settings-after-update.png" });
const video = page.video();
await ctx.close();
renameSync(await video.path(), out + "/recording.webm");
await browser.close();
log("done");
