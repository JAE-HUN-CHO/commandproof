# Examples

These examples show the kind of README content `commandproof` is intended to process.

## Minimal runnable README

````md
# Example

```sh
echo "hello"
```
````

Run it with:

```bash
commandproof README.md
```

## Mixed blocks

````md
# Example

```sh
echo "first"
```

```text
this block is ignored
```

```console
$ echo "second"
> echo "third"
```
````

## Skipped block

````md
```bash commandproof-skip
echo "do not run"
```
````

## Safer inspection

Use dry run when you only want to see what would execute:

```bash
commandproof README.md --dry-run
```

## JSON output

Automation can read the structured result:

```bash
commandproof README.md --json
```
