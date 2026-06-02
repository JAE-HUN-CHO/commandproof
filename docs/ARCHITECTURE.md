# Architecture

`commandproof` is meant to stay small and dependency-free.

## High-level flow

1. Read a Markdown file.
2. Extract fenced code blocks.
3. Keep only shell-like blocks.
4. Skip blocks marked with `commandproof-skip` or `cp-skip`.
5. Strip console prompt prefixes when needed.
6. Reject dangerous commands unless explicitly allowed.
7. Execute each block with the requested working directory and timeout.
8. Report a summary in text or JSON.

## Core components

### Parser

Responsible for reading the Markdown source and identifying fenced code blocks.

It must recognize shell-oriented info strings and ignore blocks that are marked as skipped.

### Safety filter

Checks the extracted command text before execution.

The filter should be simple and explicit so the rejected patterns are easy to understand and maintain.

### Executor

Runs each accepted block as a shell script.

It applies:

- the selected working directory
- the per-block timeout
- exit-code reporting
- stdout/stderr capture for summaries and JSON output

### Reporter

Formats the final result for humans or for automation.

The JSON shape should remain stable enough for scripts to consume.

## Design constraints

- No runtime dependencies.
- Keep the CLI compact.
- Prefer a clear failure mode over clever inference.
- Keep safety checks visible in the code and docs.

## JSON contract

The implementation keeps one execution result per runnable block and a single top-level summary object.

Top-level statuses:

- `passed`
- `failed`
- `dry-run`

Block statuses:

- `passed`
- `failed`
- `unsafe`
- `timeout`

If the CLI changes that shape, update this document together with the tests.
