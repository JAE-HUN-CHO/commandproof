# Maintainer Workflow

Use `commandproof` as a README maintenance check, not as a general shell runner.

## Inspect first

Run a dry run before executing unfamiliar documentation:

```bash
commandproof README.md --dry-run
```

Dry runs parse runnable blocks and apply the safety filter, but they do not execute accepted commands.

## Use JSON in automation

Use JSON output when CI or release tooling needs to inspect the result:

```bash
commandproof README.md --dry-run --json
```

Review the top-level `status`, `summary`, and per-block statuses. Unsafe, failed, and timed-out blocks should be treated as maintenance work before release.

## Run the package smoke check

The repository smoke script proves the example README can be parsed safely:

```bash
npm run smoke
```

Keep this command lightweight so it can run before publishing and inside CI.

## Handle unsafe blocks

If a block is rejected as unsafe, prefer one of these fixes:

- Mark non-runnable documentation snippets with `commandproof-skip`.
- Move destructive or privileged commands into prose.
- Run with `--allow-dangerous` only in a controlled environment with trusted input.

## Release routine

Before release, run:

```bash
npm test
npm run lint
npm run smoke
```

If README examples changed, run `commandproof` against the changed Markdown file with the intended `--cwd` value.
