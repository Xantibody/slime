// End-to-end check: drives the built extension in a real browser via
// agent-browser, both with the fix loaded and without it, so the run also
// proves the fixture still reproduces the bug it is meant to guard against.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SESSION = "slime";
const FIXTURE = resolve("e2e/slate-ime-fixture.html");
const VERIFY_SCRIPT = readFileSync("e2e/verify.js", "utf8");

type Report = Record<string, string | number>;

function browser(...args: readonly string[]): string {
  return execFileSync("agent-browser", args, {
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: SESSION },
  });
}

function runFixture(fix: "0" | "1"): Report {
  browser("open", `file://${FIXTURE}?fix=${fix}`);
  // agent-browser prints the evaluated value as a JSON string, and the script
  // itself returns JSON, hence the double parse.
  const raw: unknown = JSON.parse(browser("eval", VERIFY_SCRIPT));
  if (typeof raw !== "string") {
    throw new TypeError(`unexpected eval output for fix=${fix}: ${String(raw)}`);
  }

  return JSON.parse(raw) as Report;
}

const failures: string[] = [];

function check(
  label: string,
  actual: string | number | undefined,
  expected: string | number,
): void {
  const ok = actual === expected;
  process.stdout.write(`${ok ? "  ok  " : "  FAIL"} ${label}: ${String(actual)}\n`);
  if (!ok) {
    failures.push(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

process.stdout.write("Without the fix (the bug must still reproduce):\n");
const broken = runFixture("0");
check("duplicate survives the commit", broken["afterCommitSettled"], "大変だ体現だ体現");
check("duplicate survives a late re-render", broken["afterLateRerender"], "大変だ体現だ体現");
check("marks are never parked", broken["marksDuringComposition"], '{"bold":true}');
check("Ctrl+F does nothing", broken["emacsForward"], "committed:0");

process.stdout.write("\nWith the fix:\n");
const fixed = runFixture("1");
check("duplicate is gone before the next paint", fixed["afterCommitMicrotask"], "大変だ体現");
check("duplicate stays gone", fixed["afterCommitSettled"], "大変だ体現");
check("late re-render is repaired", fixed["afterLateRerender"], "大変だ体現");
check("placeholder holds only the zero-width char", fixed["placeholderAfterRerender"], "[Z]");
check("a second conversion stays clean", fixed["afterSecondCommit"], "大変だ体現です");
check("the placeholder text node is reused", fixed["placeholderChildNodes"], 1);
check("marks are parked during composition", fixed["marksDuringComposition"], "null");
check("marks are restored afterwards", fixed["marksAfterComposition"], '{"bold":true}');
check("Ctrl+F moves forward", fixed["emacsForward"], "committed:1");
check("Ctrl+F twice then Ctrl+B nets one", fixed["emacsForwardTwiceThenBack"], "committed:1");
check("Ctrl+E reaches the end of the line", fixed["emacsEnd"], "placeholder:1");
check("Ctrl+A returns to the start", fixed["emacsHome"], "committed:0");
check("unmapped Ctrl+X is left alone", fixed["emacsIgnoresUnmappedKey"], "committed:0");
check("toggling off restores the browser default", fixed["emacsAfterToggleOff"], "committed:0");
check("committed text is untouched", fixed["committedText"], "大変だ体現です");

browser("close");

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} check(s) failed:\n${failures.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("\nAll end-to-end checks passed.\n");
