// Renders the store listing images from the HTML beside them, with
// agent-browser at the exact sizes the stores ask for. Run `pnpm store:render`; it
// builds first, because the popup in the screenshots is the built one.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SESSION = "slime-store";
const PREVIEW_DIR = "dist/store-preview";

interface Image {
  readonly source: string;
  readonly width: number;
  readonly height: number;
}

// Chrome Web Store: screenshots 1280 × 800, small promo 440 × 280, marquee
// 1400 × 560. AMO shows screenshots at 1280 × 800 as well.
const IMAGES: readonly Image[] = [
  { source: "store/screenshots/fix.html", width: 1280, height: 800 },
  { source: "store/screenshots/pause.html", width: 1280, height: 800 },
  { source: "store/screenshots/emacs.html", width: 1280, height: 800 },
  { source: "store/promo/small.html", width: 440, height: 280 },
  { source: "store/promo/marquee.html", width: 1400, height: 560 },
];

function browser(...args: readonly string[]): void {
  execFileSync("agent-browser", args, {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, AGENT_BROWSER_SESSION: SESSION },
  });
}

function packageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync("package.json", "utf8"));
  const { version } = manifest as { version?: unknown };
  if (typeof version !== "string") {
    throw new TypeError("package.json has no version field");
  }

  return version;
}

// The built popup, with the two extension APIs it calls answered in place:
// the version from package.json, and `?paused=1` in the frame's URL standing
// in for the stored setting
function writePopupPreview(): void {
  const stub = `<script>
  const paused = new URLSearchParams(location.search).has("paused");
  globalThis.browser = {
    runtime: { getManifest: () => ({ version: ${JSON.stringify(packageVersion())} }) },
    storage: { local: { get: async () => ({ paused }), set: async () => {} } },
  };
</script>
`;
  const popup = readFileSync("dist/chrome/popup.html", "utf8");
  const scriptTag = '<script src="popup.js"></script>';
  if (!popup.includes(scriptTag)) {
    throw new Error(`dist/chrome/popup.html no longer loads popup.js with ${scriptTag}`);
  }

  mkdirSync(PREVIEW_DIR, { recursive: true });
  cpSync("dist/chrome/popup.js", `${PREVIEW_DIR}/popup.js`);
  cpSync("dist/chrome/icons", `${PREVIEW_DIR}/icons`, { recursive: true });
  writeFileSync(`${PREVIEW_DIR}/popup.html`, popup.replace(scriptTag, `${stub}${scriptTag}`));
}

writePopupPreview();

for (const { source, width, height } of IMAGES) {
  const output = source.replace(/\.html$/u, ".png");
  browser("set", "viewport", String(width), String(height), "1");
  browser("set", "media", "light");
  browser("open", `file://${resolve(source)}`);
  browser("wait", "--load", "networkidle");
  browser("screenshot", output);
  process.stdout.write(`${output} (${width}x${height})\n`);
}

browser("close");
