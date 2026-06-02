# Safety Model

`commandproof` is intentionally conservative. Its job is to run documentation snippets, not to blindly trust every shell block in a README.

## Default blocking

The CLI blocks dangerous commands by default. The current safety policy rejects patterns such as:

- `sudo`
- `rm -rf /`
- `curl | sh`, `curl | bash`, and `curl | zsh`
- `wget | sh`, `wget | bash`, and `wget | zsh`
- `mkfs`
- `dd of=`
- `chmod -R 777 /`

The run should fail with exit code `1` when a block is rejected as unsafe.

## Bypass

Use `--allow-dangerous` only when you intentionally want to bypass the safety filter.

This option should be reserved for controlled environments and trusted inputs.

## Scope

The safety layer applies to runnable shell blocks after Markdown extraction and before execution.

It does not try to prove that a command is harmless. It only rejects a defined set of risky patterns.

## Operational guidance

- Prefer `--dry-run` when inspecting unfamiliar documentation.
- Prefer isolated test fixtures over running third-party README files directly.
- Treat any bypassed execution as manual, high-trust work.
