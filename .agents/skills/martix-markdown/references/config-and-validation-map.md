## Purpose

Use this map to choose the narrowest markdownlint control surface before editing
content or suppressing findings.

## Decision order

1. Fix the Markdown content when the finding is local and the repair improves
   structure, readability, or accessibility.
1. Change repository config when the same justified exception repeats across many
   files.
1. Use file-local exceptions only when one file genuinely differs from the
   repository baseline.
1. Reach for custom rules only when built-in rules, aliases, tags, and shared
   config cannot express the policy.
1. Revisit formatter ownership if another tool keeps reintroducing the same
   findings.

## Configuration surfaces

| Surface | Upstream behavior | Best for | Avoid |
| --- | --- | --- | --- |
| `options.config` and `.markdownlint.json*` | All rules are enabled by default; keys can be rule IDs, aliases, tags, or `default`; values can disable, enable, warn, or configure. | Repo-wide policy and durable overrides. | One-off content mistakes. |
| `extends` and `readConfig` | Shared styles can build on other files or packages. | Layered baselines across packages or repositories. | Hiding local-only quirks in a global base style. |
| `options.frontMatter` | Front matter is ignored by most rules through a default regex. | Teaching markdownlint how to skip metadata blocks. | Rewriting metadata into prose just to appease the linter. |
| `options.noInlineConfig` | Inline HTML comment controls are allowed unless config disables them. | Repositories that want all policy centralized. | Blocking a justified local exception without an alternate path. |
| `options.configParsers` | `markdownlint-configure-file` blocks default to JSON, but alternate parsers can be added. | File-local config comments that need YAML, TOML, or another parser. | Turning per-file policy into an unreadable mini-language. |
| `options.customRules` | Imported or local custom rules run alongside built-ins. | Policies that built-in rules and tags cannot express. | Replacing built-ins with custom rules that duplicate existing behavior. |

## File-local exception surfaces

| Surface | Scope | Best for | Avoid |
| --- | --- | --- | --- |
| `markdownlint-disable-line` and `markdownlint-disable-next-line` | One line | Surgical exceptions inside examples. | Repeated patterns that belong in config. |
| `markdownlint-disable` and `markdownlint-enable` | A block | Temporary exceptions around a short region. | Large undocumented suppressions. |
| `markdownlint-capture` and `markdownlint-restore` | A block with saved prior state | Returning cleanly to the previous config after a temporary disable. | Replacing a simpler explicit enable when only one rule is in play. |
| `markdownlint-disable-file` and `markdownlint-enable-file` | Whole file | Generated content or rare file-wide differences. | Hiding many unrelated findings in authored docs. |
| `markdownlint-configure-file` | Whole file | One file that needs different rule parameters. | Embedding shared policy that should live in repo config. |

## Validation surfaces

| Surface | When to use | Notes |
| --- | --- | --- |
| `npx markdownlint-cli2 "..."` | Focused command-line validation for changed files. | Prefer the smallest relevant file set. |
| IDE diagnostics or a markdownlint editor extension | Fast inner-loop checks while editing. | Useful fallback when a CLI command is unavailable. |
| `lint` API via `markdownlint/async`, `markdownlint/sync`, or `markdownlint/promise` | Tooling integration, scripted validation, or custom automation. | Asynchronous custom rules require the async or promise API. |
| `applyFixes` after linting | Applying safe autofixes consistently in tooling. | Re-run lint after autofix because structural issues can remain. |
| Shared config readers and schema validation | Validating reusable config files and style packages. | Especially helpful when `extends` chains grow. |

## Current package overlay

- [`.markdownlint.json`](../.markdownlint.json) in this skill package sets
  `MD013.line_length = 400`, excludes code blocks and tables from that local
  check, and disables `MD041`.
- Focused validation in this repository currently succeeds with
  `npx --yes markdownlint-cli2 "skills/martix-markdown/**/*.md"`.
- Treat those notes as package-local validation guidance, not as upstream
  markdownlint defaults for other repositories.

## Related files

- [Foundation and configuration](../rules/foundation-configuration.md)
- [Custom rules, suppressions, and toolchain coexistence](../rules/custom-rules-suppressions-toolchain.md)
- [Install and validation notes](./install-and-validation.md)
- [Prettier and tooling notes](./prettier-and-tooling-notes.md)
- [markdownlint config template](../templates/markdownlint-cli2-config.template.jsonc)

## Source anchors

- [Source index and approved source families](./doc-source-index.md)
- [markdownlint README: configuration and inline controls](https://github.com/DavidAnson/markdownlint/blob/main/README.md#configuration)
- [markdownlint README: API options](https://github.com/DavidAnson/markdownlint/blob/main/README.md#api)
- [markdownlint README: shared config and `extends`](https://github.com/DavidAnson/markdownlint/blob/main/README.md#config)
- [markdownlint README: fixing helpers](https://github.com/DavidAnson/markdownlint/blob/main/README.md#fixing)
- [Custom rules guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md)
