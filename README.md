# commandproof

`commandproof` is a no-dependency Node.js CLI that proves the shell blocks in a Markdown file actually run.

It scans fenced code blocks, filters the ones that look like shell commands, and executes them in order. Use it as a small maintenance check before shipping docs or wiring README proofs into CI.

## Install

```bash commandproof-skip
npm install
```

If you want to run the CLI from the local checkout, use the package binary:

```bash commandproof-skip
node bin/commandproof.js --help
```

## Usage

```bash commandproof-skip
commandproof [file=README.md] [--cwd <dir>] [--timeout <ms>] [--json] [--dry-run] [--allow-dangerous]
```

This repository keeps one runnable README proof block:

```bash
node bin/commandproof.js examples/README.md --dry-run
```

For the packaged smoke check, run:

```bash commandproof-skip
npm run smoke
```

### Supported options

- `file`: Markdown file to scan. Defaults to `README.md`.
- `--cwd <dir>`: Set the working directory used for execution.
- `--timeout <ms>`: Set the per-block execution timeout in milliseconds.
- `--json`: Emit machine-readable output.
- `--dry-run`: List runnable blocks without executing them. Safety checks still run.
- `--allow-dangerous`: Disable safety blocking for dangerous shell patterns.

`commandproof` does not write its own state directory. Any files created during a non-dry run come from the commands in the Markdown file, and `--cwd <dir>` controls where those commands execute.

## What it runs

The CLI is designed to run fenced blocks with these info strings:

- `sh`
- `bash`
- `zsh`
- `shell`
- `console`
- `terminal`

It skips blocks marked with `commandproof-skip` or `cp-skip`.

For `console` blocks, prompt prefixes such as `$ ` and `> ` are stripped before execution.

## Exit codes

- `0`: All runnable blocks passed, or the run was a successful dry run.
- `1`: A block failed, timed out, or was rejected as unsafe.
- `2`: The CLI could not read the file or the invocation was invalid.

## Safety

By default, the CLI refuses to run dangerous commands such as `sudo`, `rm -rf /`, `curl | sh`, `curl | zsh`, `wget | sh`, `wget | zsh`, `mkfs`, `dd of=`, and `chmod -R 777 /`.

Use `--allow-dangerous` only when you explicitly want to bypass that protection.

See [docs/SAFETY.md](./docs/SAFETY.md) for the full safety model.

## Documentation

- [CLI reference](./docs/CLI.md)
- [Architecture notes](./docs/ARCHITECTURE.md)
- [Safety model](./docs/SAFETY.md)
- [Maintainer workflow](./docs/MAINTAINER_WORKFLOW.md)
- [Examples](./examples/README.md)

## Continuous integration

The CI workflow runs:

- `npm test`
- `npm run lint`
- `npm run smoke`

It targets Node 20 and Node 22.
