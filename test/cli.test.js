import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("bin/commandproof.js");

async function withTempProject(readme, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "commandproof-cli-"));
  try {
    await writeFile(path.join(dir, "README.md"), readme);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runCli(args, options = {}) {
  try {
    const result = await execFileAsync("node", [cliPath, ...args], options);
    return { status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      status: error.code,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}

test("CLI executes README blocks and emits JSON", async () => {
  await withTempProject(
    `
\`\`\`bash
echo alpha
\`\`\`

\`\`\`console
$ echo beta
transcript output
> echo gamma
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--json"], { cwd: dir });
      const payload = JSON.parse(result.stdout);

      assert.equal(result.status, 0);
      assert.equal(payload.status, "passed");
      assert.equal(payload.summary.total, 2);
      assert.equal(payload.summary.passed, 2);
      assert.deepEqual(
        payload.blocks.map((block) => ({
          status: block.status,
          stdout: block.stdout.trim(),
        })),
        [
          { status: "passed", stdout: "alpha" },
          { status: "passed", stdout: "beta\ngamma" },
        ],
      );
    },
  );
});

test("CLI respects --cwd when commands write files", async () => {
  await withTempProject(
    `
\`\`\`bash
node -e "require('node:fs').writeFileSync('marker.txt', 'ok')"
\`\`\`
`,
    async (dir) => {
      const runDir = await mkdtemp(path.join(tmpdir(), "commandproof-run-"));
      try {
        const result = await runCli([path.join(dir, "README.md"), "--cwd", runDir, "--json"], {
          cwd: dir,
        });
        const payload = JSON.parse(result.stdout);

        assert.equal(result.status, 0);
        assert.equal(payload.summary.passed, 1);
        await stat(path.join(runDir, "marker.txt"));
      } finally {
        await rm(runDir, { recursive: true, force: true });
      }
    },
  );
});

test("CLI blocks dangerous commands by default", async () => {
  await withTempProject(
    `
\`\`\`bash
sudo echo nope
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--json"], { cwd: dir });
      const payload = JSON.parse(result.stdout);

      assert.equal(result.status, 1);
      assert.equal(payload.status, "failed");
      assert.equal(payload.summary.unsafe, 1);
      assert.equal(payload.blocks[0].status, "unsafe");
    },
  );
});

test("CLI reports command failures and timeouts as exit code 1", async () => {
  await withTempProject(
    `
\`\`\`bash
exit 7
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--json"], { cwd: dir });
      const payload = JSON.parse(result.stdout);
      assert.equal(result.status, 1);
      assert.equal(payload.summary.failed, 1);
      assert.equal(payload.blocks[0].exitCode, 7);
    },
  );

  await withTempProject(
    `
\`\`\`bash
node -e "setTimeout(() => {}, 200)"
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--json", "--timeout", "50"], { cwd: dir });
      const payload = JSON.parse(result.stdout);
      assert.equal(result.status, 1);
      assert.equal(payload.summary.timedOut, 1);
      assert.equal(payload.blocks[0].status, "timeout");
    },
  );
});

test("CLI dry-run succeeds without executing commands", async () => {
  await withTempProject(
    `
\`\`\`bash
node -e "require('node:fs').writeFileSync('marker.txt', 'ok')"
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--dry-run", "--json"], { cwd: dir });
      const payload = JSON.parse(result.stdout);

      assert.equal(result.status, 0);
      assert.equal(payload.status, "dry-run");
      assert.equal(payload.summary.dryRun, 1);
      await assert.rejects(stat(path.join(dir, "marker.txt")));
    },
  );
});

test("CLI dry-run still reports unsafe commands", async () => {
  await withTempProject(
    `
\`\`\`bash
sudo echo nope
\`\`\`
`,
    async (dir) => {
      const result = await runCli(["--dry-run", "--json"], { cwd: dir });
      const payload = JSON.parse(result.stdout);

      assert.equal(result.status, 1);
      assert.equal(payload.status, "failed");
      assert.equal(payload.summary.unsafe, 1);
      assert.equal(payload.blocks[0].status, "unsafe");
    },
  );
});

test("CLI uses exit code 2 for missing files and supports help/version", async () => {
  const missingResult = await runCli(["missing.md"]);
  assert.equal(missingResult.status, 2);
  assert.match(missingResult.stderr, /Cannot read/i);

  const missingCwdValue = await runCli(["--cwd", "--json"]);
  assert.equal(missingCwdValue.status, 2);
  assert.match(missingCwdValue.stderr, /--cwd requires a directory/);

  const helpResult = await runCli(["--help"]);
  assert.equal(helpResult.status, 0);
  assert.match(helpResult.stdout, /commandproof/);

  const versionResult = await runCli(["--version"]);
  assert.equal(versionResult.status, 0);
  assert.equal(versionResult.stdout.trim(), "0.1.0");
});
