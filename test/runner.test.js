import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { runMarkdownFile } from "../src/runner.js";

async function withTempProject(readme, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "commandproof-test-"));
  try {
    const readmePath = path.join(dir, "README.md");
    await writeFile(readmePath, readme);
    return await fn({ dir, readmePath });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("executes safe README commands successfully", async () => {
  await withTempProject(
    `
\`\`\`sh
printf "ok" > proof.txt
test -f proof.txt
\`\`\`
`,
    async ({ readmePath }) => {
      const result = await runMarkdownFile(readmePath, { timeoutMs: 2000 });
      assert.equal(result.status, "passed");
      assert.equal(result.summary.passed, 1);
      assert.equal(result.summary.failed, 0);
    },
  );
});

test("dry run reports commands without executing them", async () => {
  await withTempProject(
    `
\`\`\`sh
printf "created" > proof.txt
\`\`\`
`,
    async ({ dir, readmePath }) => {
      const result = await runMarkdownFile(readmePath, { dryRun: true });
      assert.equal(result.status, "dry-run");
      assert.equal(result.summary.dryRun, 1);
      assert.equal(result.blocks[0].script.includes("proof.txt"), true);
      await assert.rejects(import("node:fs/promises").then(({ stat }) => stat(path.join(dir, "proof.txt"))));
    },
  );
});

test("dry run still blocks dangerous commands", async () => {
  await withTempProject(
    `
\`\`\`sh
sudo echo nope
\`\`\`
`,
    async ({ readmePath }) => {
      const result = await runMarkdownFile(readmePath, { dryRun: true });
      assert.equal(result.status, "failed");
      assert.equal(result.summary.unsafe, 1);
      assert.equal(result.blocks[0].status, "unsafe");
    },
  );
});

test("blocks dangerous commands by default", async () => {
  await withTempProject(
    `
\`\`\`sh
sudo echo nope
\`\`\`
`,
    async ({ readmePath }) => {
      const result = await runMarkdownFile(readmePath, {});
      assert.equal(result.status, "failed");
      assert.equal(result.summary.unsafe, 1);
      assert.match(result.blocks[0].error, /unsafe/i);
    },
  );
});

test("marks failed commands as failed", async () => {
  await withTempProject(
    `
\`\`\`sh
exit 7
\`\`\`
`,
    async ({ readmePath }) => {
      const result = await runMarkdownFile(readmePath, { timeoutMs: 2000 });
      assert.equal(result.status, "failed");
      assert.equal(result.summary.failed, 1);
      assert.equal(result.blocks[0].exitCode, 7);
    },
  );
});

test("times out hung commands", async () => {
  await withTempProject(
    `
\`\`\`sh
node -e "setTimeout(() => {}, 5000)"
\`\`\`
`,
    async ({ readmePath }) => {
      const result = await runMarkdownFile(readmePath, { timeoutMs: 100 });
      assert.equal(result.status, "failed");
      assert.equal(result.summary.timedOut, 1);
      assert.equal(result.blocks[0].timedOut, true);
    },
  );
});
