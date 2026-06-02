import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { parseMarkdownCommands } from "./parser.js";
import { findUnsafeCommand } from "./safety.js";

const execFileAsync = promisify(execFile);

function createSummary(total) {
  return {
    total,
    passed: 0,
    failed: 0,
    unsafe: 0,
    timedOut: 0,
    dryRun: 0,
  };
}

function summarize(blocks, dryRun) {
  const summary = createSummary(blocks.length);
  for (const block of blocks) {
    if (block.status === "passed") summary.passed += 1;
    if (block.status === "failed") summary.failed += 1;
    if (block.status === "unsafe") summary.unsafe += 1;
    if (block.status === "timeout") summary.timedOut += 1;
    if (block.status === "dry-run") summary.dryRun += 1;
  }

  const failed = summary.failed > 0 || summary.unsafe > 0 || summary.timedOut > 0;
  return {
    status: failed ? "failed" : dryRun ? "dry-run" : "passed",
    summary,
  };
}

async function executeBlock(block, options) {
  const unsafePattern = options.allowDangerous ? null : findUnsafeCommand(block.script);
  if (unsafePattern) {
    return {
      ...block,
      status: "unsafe",
      error: `Unsafe command blocked: ${unsafePattern}`,
    };
  }

  if (options.dryRun) {
    return { ...block, status: "dry-run" };
  }

  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(options.shell, ["-c", block.script], {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      maxBuffer: options.maxBuffer,
      windowsHide: true,
    });

    return {
      ...block,
      status: "passed",
      exitCode: 0,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const timedOut = Boolean(error.killed || error.signal === "SIGTERM");
    return {
      ...block,
      status: timedOut ? "timeout" : "failed",
      exitCode: typeof error.code === "number" ? error.code : null,
      signal: error.signal ?? null,
      timedOut,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      error: timedOut ? `Command timed out after ${options.timeoutMs}ms` : error.message,
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function runMarkdownFile(filePath, options = {}) {
  const resolvedFile = path.resolve(filePath);
  const markdown = await readFile(resolvedFile, "utf8");
  const blocks = parseMarkdownCommands(markdown);
  const runtime = {
    cwd: path.resolve(options.cwd ?? path.dirname(resolvedFile)),
    timeoutMs: Number(options.timeoutMs ?? 30000),
    shell: options.shell ?? process.env.SHELL ?? "/bin/sh",
    dryRun: Boolean(options.dryRun),
    allowDangerous: Boolean(options.allowDangerous),
    maxBuffer: options.maxBuffer ?? 1024 * 1024,
  };

  const results = [];
  for (const block of blocks) {
    results.push(await executeBlock(block, runtime));
  }

  return {
    file: resolvedFile,
    cwd: runtime.cwd,
    timeoutMs: runtime.timeoutMs,
    shell: runtime.shell,
    ...summarize(results, runtime.dryRun),
    blocks: results,
  };
}
