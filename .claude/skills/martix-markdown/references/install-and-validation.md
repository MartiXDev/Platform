## Purpose

Use this reference when installing, previewing, or validating the
`martix-markdown` skill package.

## Package layout requirements

- Keep `SKILL.md` in the package root.
- Keep bundled references and templates in subfolders with relative links from
  `SKILL.md`.
- Include `LICENSE.txt` and `README.md` so the package is easier to distribute,
  install, and maintain.

## Recommended install commands

Use `npx skills add`, not `npx skill add`.

For local filesystem use in this repository, prefer an absolute path:

```powershell
npx skills add C:\Git\MartiXDev\skills\skills\martix-markdown --list
npx skills add C:\Git\MartiXDev\skills\skills\martix-markdown -a github-copilot --copy -y
```

## Validation workflow

1. Preview the package with `--list` before documenting install steps.
2. Verify the installed name with `npx skills list`.
3. Run markdownlint on the smallest relevant file set.
4. Prefer existing repository lint commands if they already wrap markdownlint.

```powershell
npx markdownlint-cli2 "skills/martix-markdown/**/*.md"
```

## When to use the bundled template

Use
[the markdownlint config template](../templates/markdownlint-cli2-config.template.jsonc)
when:

- a repository lacks any markdownlint config,
- the user wants a reusable repo policy rather than one-off edits, or
- the same justified exception is appearing across many files.

Keep overrides minimal and explain why each non-default rule exists.

## Troubleshooting

- If install preview fails, verify that `SKILL.md` is present at the package
  root.
- If lint commands are unavailable, use IDE diagnostics or the repository's
  existing documentation checks.
- If repo conventions intentionally differ from markdownlint defaults, encode
  them in config instead of repeating manual exceptions in every file.
