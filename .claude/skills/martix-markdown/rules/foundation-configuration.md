# Markdownlint foundation and configuration

Use this grouped rule file for config-first decisions that shape how the rest of
the markdownlint rule library behaves.

## Purpose

- Decide whether a lint finding should be fixed in content, in config, or in a
  later repository-specific bridge note before editing large batches of files.
- Keep the upstream markdownlint control surfaces clear: rules are enabled by
  default, then narrowed by config, tags, aliases, and reusable styles.
- Own the two built-in rules that are most obviously policy-driven in this
  package taxonomy: `MD013` and `MD044`.

## Upstream default

| Surface | Upstream default | High-value options or selectors | Review guidance |
| --- | --- | --- | --- |
| Global rule selection | All built-in rules are enabled when no config object is provided. Config keys can be rule IDs, aliases, tags, or `default`, and keys are case-insensitive. | `default`, rule IDs, aliases, tags, `severity`, `enabled` | Use config for repeated policy, not for a one-off content mistake. Later keys override earlier ones. |
| Reusable config | `options.config` can live inline, in `.markdownlint.json`, or in a shared style loaded with `extends` and `readConfig`. | `extends`, `readConfig`, `readConfigSync`, `options.configParsers` | Prefer shared styles when the same exceptions repeat across many files or repositories. |
| Parsing boundary | Front matter and HTML comments are ignored by most rules. | `options.frontMatter` | Teach markdownlint how to skip metadata blocks instead of rewriting metadata into plain text. |
| `MD013` `line-length` | The default maximum line length is `80`, with headings, code blocks, and tables checked unless config changes that behavior. | `line_length`, `heading_line_length`, `code_block_line_length`, `headings`, `code_blocks`, `tables`, `strict`, `stern` | Fix isolated wrapping in content first. Change the rule only when the repository has a stable wrap-width policy. |
| `MD044` `proper-names` | The rule is available by default, but it only becomes meaningful when the `names` array is populated. | `names`, `code_blocks`, `html_elements` | Add a maintained list of canonical names before relying on this rule. Otherwise it becomes noisy or inert. |

- `options.config` values can disable (`false`), enable as errors (`true` or
  `"error"`), enable as warnings (`"warning"`), or both enable and configure a
  rule with an object.
- Tag-level config is powerful, but broad. Use tags such as `headings`,
  `blank_lines`, or `table` only when the repository genuinely wants a
  family-wide policy.
- `MD013` already tolerates long tokens without spaces unless `strict` is set.
  Do not disable the rule just because a document contains long URLs or other
  unbreakable text.
- `MD044` is best treated as a shared style decision. It is not a substitute for
  a spell-checker or a general writing review.

## Repo-local overlay

- This skill package's own [`.markdownlint.json`](../.markdownlint.json) raises
  `MD013.line_length` to `400`, excludes code blocks and tables from that local
  check, and disables `MD041`.
- Treat those values as package-local validation settings for the bundled docs,
  not as upstream markdownlint defaults for every repository.
- If a repository needs durable line-length, title, or proper-name overlays,
  encode them in repo config and capture the broader rationale in the future
  instruction-bridge layer instead of repeating the exception in every rule
  note.

## Avoid

- Do not present package-local `.markdownlint.json` values as if they were
  upstream markdownlint defaults.
- Do not disable a whole tag family when only one rule needs tuning.
- Do not enable `MD044` without a maintained list of canonical names.
- Do not relax `MD013` because of rare long tokens that the default rule already
  tolerates.
- Do not use config to hide a content problem when a local edit is smaller and
  clearer.

## Review checklist

- [ ] The chosen lever is explicit: content edit, config change, or future
      bridge note.
- [ ] Rule IDs, aliases, tags, or config surfaces are named precisely.
- [ ] Any `MD013` or `MD044` change is tied to a stable local policy.
- [ ] Package-local overrides are labeled as overlays rather than upstream
      semantics.

## Related files

- [Grouped rule family map](../references/rule-family-map.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Install and validation notes](../references/install-and-validation.md)
- [markdownlint config template](../templates/markdownlint-cli2-config.template.jsonc)
- [Custom rules, suppressions, and toolchain coexistence](./custom-rules-suppressions-toolchain.md)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint README: rules and aliases](https://github.com/DavidAnson/markdownlint/blob/main/README.md#rules--aliases)
- [markdownlint README: tags](https://github.com/DavidAnson/markdownlint/blob/main/README.md#tags)
- [markdownlint README: configuration](https://github.com/DavidAnson/markdownlint/blob/main/README.md#configuration)
- [markdownlint README: API config and shared styles](https://github.com/DavidAnson/markdownlint/blob/main/README.md#config)
- [MD013 line length](https://github.com/DavidAnson/markdownlint/blob/main/doc/md013.md)
- [MD044 proper names](https://github.com/DavidAnson/markdownlint/blob/main/doc/md044.md)
