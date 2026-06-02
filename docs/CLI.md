# CLI Reference

This document describes the expected `commandproof` command line contract.

## Command

```bash
commandproof [file=README.md] [--cwd <dir>] [--timeout <ms>] [--json] [--dry-run] [--allow-dangerous]
```

## Arguments

### `file`

Optional positional path to the Markdown file to scan.

- Default: `README.md`
- Behavior: the file is read as Markdown and scanned for runnable shell blocks.

### `--cwd <dir>`

Sets the working directory used when executing shell blocks.

- If omitted, execution uses the directory containing the Markdown file.
- Relative paths are resolved by Node.js from the current process and normalized internally.

### `--timeout <ms>`

Sets the per-block timeout in milliseconds.

- If omitted, the implementation default applies.
- A block that exceeds the timeout is treated as a failure and exits with code `1`.

### `--json`

Emits machine-readable output instead of the default human-readable summary.

### `--dry-run`

Lists runnable blocks without executing them.

- Safety checks still apply.
- A successful dry run exits with code `0`.

### `--allow-dangerous`

Disables the default dangerous-command filter.

Use this only when you explicitly want to execute commands that would otherwise be blocked.

## Shell block detection

The CLI treats these fenced block labels as runnable:

- `sh`
- `bash`
- `zsh`
- `shell`
- `console`
- `terminal`

Blocks with info strings that include `commandproof-skip` or `cp-skip` are ignored.

For `console` blocks, prompt markers are removed before execution:

- `$ `
- `> `

## Output

### Human-readable mode

The default mode should present:

- the file being scanned
- the number of runnable blocks discovered
- per-block execution status
- a final summary

### JSON mode

JSON output should report:

- overall status
- summary data
- per-block results

The implementation currently uses these top-level statuses:

- `passed`
- `dry-run`
- `failed`

Read/usage errors are printed to `stderr` and exit with code `2`.

The implementation may include additional block metadata, but those concepts and the status values above must remain visible.

`--help` and `--version` are also supported by the CLI wrapper.

## Exit codes

- `0`: All runnable blocks passed, or the run completed as a successful dry run.
- `1`: At least one runnable block failed, timed out, or was blocked as unsafe.
- `2`: The file could not be read, or the CLI was invoked incorrectly.

## Examples

```bash
# Run the current README
commandproof
```

```bash
# Scan a different file
commandproof docs/guide.md
```

```bash
# Use a fixed working directory
commandproof README.md --cwd .
```

```bash
# Preview the extracted blocks without execution
commandproof README.md --dry-run
```

```bash
# Emit JSON for automation
commandproof README.md --json
```
