// Build script: Generate Chrome and Firefox extensions
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import { LOCALES, localeMessages } from "./locales.ts";
import { generateChromeManifest, generateFirefoxManifest } from "./manifest.ts";
import type { ChromeManifest, FirefoxManifest } from "./manifest.ts";

// Release builds take the version from the tag (`VERSION` in the workflow);
// local builds fall back to package.json so `pnpm build` needs no ceremony.
function resolveVersion(): string {
  const fromTag = process.env["VERSION"];
  if (fromTag !== undefined && fromTag !== "") {
    return fromTag;
  }

  const manifest: unknown = JSON.parse(readFileSync("package.json", "utf8"));
  const { version } = manifest as { version?: unknown };
  if (typeof version !== "string") {
    throw new TypeError("package.json has no version field");
  }

  return version;
}

const VERSION = resolveVersion();

const TARGETS = ["chrome", "firefox"] as const;
type Target = (typeof TARGETS)[number];

interface TargetConfig {
  readonly manifest: ChromeManifest | FirefoxManifest;
  readonly background: string;
  readonly packagePath: string;
}

const CONFIGS: Readonly<Record<Target, TargetConfig>> = {
  chrome: {
    manifest: generateChromeManifest(VERSION),
    background: "src/entrypoints/background/chrome.ts",
    packagePath: "dist/slime-chrome.zip",
  },
  firefox: {
    manifest: generateFirefoxManifest(VERSION),
    background: "src/entrypoints/background/firefox.ts",
    packagePath: "dist/slime-firefox.xpi",
  },
};

const STATIC_FILES: readonly (readonly [source: string, destination: string])[] = [
  ["src/entrypoints/popup/index.html", "popup.html"],
  ["icons/icon-16.png", "icons/icon-16.png"],
  ["icons/icon-48.png", "icons/icon-48.png"],
  ["icons/icon-128.png", "icons/icon-128.png"],
];

async function bundle(
  entryPoints: Readonly<Record<string, string>>,
  outdir: string,
): Promise<void> {
  await build({
    entryPoints,
    outdir,
    bundle: true,
    format: "iife",
    target: "es2022",
    platform: "browser",
    charset: "utf8",
    banner: { js: "// Slime - auto-generated from src/, do not edit" },
  });
}

async function buildTarget(target: Target): Promise<void> {
  const { manifest, background, packagePath } = CONFIGS[target];
  const distDir = `dist/${target}`;

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(`${distDir}/icons`, { recursive: true });

  await bundle(
    {
      inject: "src/entrypoints/page.ts",
      "content-script": "src/entrypoints/content.ts",
      popup: "src/entrypoints/popup/main.ts",
      background,
    },
    distDir,
  );

  writeFileSync(`${distDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  for (const locale of LOCALES) {
    mkdirSync(`${distDir}/_locales/${locale}`, { recursive: true });
    writeFileSync(
      `${distDir}/_locales/${locale}/messages.json`,
      `${JSON.stringify(localeMessages(locale), null, 2)}\n`,
    );
  }
  for (const [source, destination] of STATIC_FILES) {
    cpSync(source, `${distDir}/${destination}`);
  }

  rmSync(packagePath, { force: true });
  execFileSync("zip", ["-r", `../../${packagePath}`, "."], { cwd: distDir, stdio: "inherit" });

  process.stdout.write(`Built ${target} extension -> ${distDir}/ and ${packagePath}\n`);
}

function parseTargets(argument: string | undefined): readonly Target[] {
  if (argument === undefined) {
    return TARGETS;
  }
  if (TARGETS.includes(argument as Target)) {
    return [argument as Target];
  }

  throw new Error(`Unknown build target: ${argument} (expected one of ${TARGETS.join(", ")})`);
}

for (const target of parseTargets(process.argv[2])) {
  await buildTarget(target);
}
