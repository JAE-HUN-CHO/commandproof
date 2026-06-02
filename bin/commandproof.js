#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { runMarkdownFile } from "../src/runner.js";

const VERSION = "0.1.0";

function printHelp() {
  console.log(`commandproof ${VERSION}

Usage:
  commandproof [file=README.md] [options]

Options:
  --cwd <dir>           Directory to execute commands from.
  --timeout <ms>        Per-block timeout in milliseconds. Default: 30000.
  --json                Print machine-readable JSON.
  --dry-run             Parse and report commands without executing them.
  --allow-dangerous     Disable built-in dangerous-command blocking.
  --version             Print version.
  --help                Print this help.
`);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    file: "README.md",
    cwd: undefined,
    timeoutMs: 30000,
    json: false,
    dryRun: false,
    allowDangerous: false,
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--help" || arg === "-h") return { help: true, options };
    if (arg === "--version") return { version: true, options };
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--allow-dangerous") {
      options.allowDangerous = true;
      continue;
    }
    if (arg === "--cwd") {
      options.cwd = args.shift();
      if (!options.cwd || options.cwd.startsWith("-")) {
        throw new Error("--cwd requires a directory");
      }
      continue;
    }
    if (arg === "--timeout") {
      const rawValue = args.shift();
      if (!rawValue || rawValue.startsWith("-")) {
        throw new Error("--timeout requires a positive integer");
      }
      const value = Number(rawValue);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--timeout requires a positive integer");
      }
      options.timeoutMs = value;
      continue;
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.file = arg;
  }

  return { options };
}

function printText(result) {
  const label = result.status === "passed" ? "PASS" : result.status === "dry-run" ? "DRY-RUN" : "FAIL";
  console.log(`${label} ${result.file}`);
  console.log(
    `summary: total=${result.summary.total} passed=${result.summary.passed} failed=${result.summary.failed} unsafe=${result.summary.unsafe} timedOut=${result.summary.timedOut} dryRun=${result.summary.dryRun}`,
  );

  for (const block of result.blocks) {
    const detail = block.error ? ` - ${block.error}` : "";
    console.log(`${block.status.toUpperCase()} block ${block.index} line ${block.lineStart}${detail}`);
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Usage error: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  if (parsed.help) {
    printHelp();
    return;
  }

  if (parsed.version) {
    console.log(VERSION);
    return;
  }

  try {
    await readFile(parsed.options.file, "utf8");
  } catch (error) {
    console.error(`Cannot read ${parsed.options.file}: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const result = await runMarkdownFile(parsed.options.file, parsed.options);
  if (parsed.options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printText(result);
  }

  process.exitCode = result.status === "failed" ? 1 : 0;
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
