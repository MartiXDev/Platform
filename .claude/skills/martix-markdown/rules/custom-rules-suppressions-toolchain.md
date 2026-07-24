# Markdownlint custom rules, suppressions, and toolchain coexistence

Use this grouped rule file for escape hatches and extension points: inline
exceptions, file-local config, custom rules, and formatter coexistence.

## Purpose

- Choose the narrowest mechanism that solves a markdownlint mismatch without
  hiding broader content problems.
- Keep built-in rule guidance separate from extension and suppression workflow
  decisions.
- Make formatter coexistence explicit so markdownlint, Prettier, and any local
  tooling each have a clear owner.

## Upstream default

| Surface | Upstream default | High-value options | Review guidance |
| --- | --- | --- | --- |
| Inline control comments | Markdown HTML comments can disable, enable, capture, restore, or configure rules for a line, block, or whole file. | `markdownlint-disable`, `markdownlint-enable`, `markdownlint-disable-line`, `markdownlint-disable-next-line`, `markdownlint-disable-file`, `markdownlint-configure-file` | Use inline controls only for narrow, visible exceptions. Repeated patterns belong in repo config. |
| Central config enforcement | Inline comments are honored unless config disables them. | `options.noInlineConfig`, `options.configParsers` | Turn off inline config when a repository wants all policy to live in shared config files. |
| Custom rules | `options.customRules` adds imported or local rules that use the same config syntax as built-ins. | `names`, `tags`, `parser`, `asynchronous`, `information`, `function` | Reach for custom rules only when built-ins, aliases, tags, or shared config cannot express the policy. |
| Parser and helper choices | Custom rules should prefer `micromark`; `markdownit` is legacy support and `none` is for direct text checks. | `parser = "micromark"`, `parser = "markdownit"`, `parser = "none"`, `markdownlint-rule-helpers` | Name the parser and helper assumptions explicitly when reviewing or authoring a custom rule. |
| Formatter coexistence | Prettier generally works with markdownlint by default. | upstream Prettier style, `MD007`, `MD030` | Use narrow coexistence notes when a formatter introduces repeatable conflicts. Do not disable unrelated rule families. |

- `markdownlint-configure-file` applies top-to-bottom across the whole file, so
  it should stay rare and easy to justify.
- `options.noInlineConfig = true` is the upstream escape hatch for repositories
  that want central configuration only.
- Asynchronous custom rules cannot run through `markdownlint/sync`; they require
  `markdownlint/async` or `markdownlint/promise`.
- None of the built-in rules use the `markdown-it` parser. That parser only
  matters when custom rules explicitly request it.

## Repo-local overlay

- Keep repository-specific toolchain comparisons in the future
  instruction-bridge layer instead of cloning them into every grouped rule file.
- Use [Prettier and tooling notes](../references/prettier-and-tooling-notes.md)
  for the package-local coexistence summary when a repository needs a narrow
  markdownlint-versus-formatter decision aid.

## Avoid

- Do not disable a whole file when a single-line or single-rule exception is
  enough.
- Do not create a custom rule for policy that built-in rules, tags, or shared
  config already cover.
- Do not leave hidden `markdownlint-configure-file` policy blocks in content
  when repo config would be clearer.
- Do not run asynchronous custom rules from synchronous call sites.
- Do not treat "formatter conflict" as a blanket reason to disable unrelated
  rule families.

## Review checklist

- [ ] The chosen escape hatch is the narrowest one that solves the problem.
- [ ] Repeated exceptions were moved to config or a shared style instead of
      inline comments.
- [ ] Any custom rule design names its parser, tags, and sync or async behavior.
- [ ] Formatter coexistence notes identify the actual rule or setting in
      conflict.

## Related files

- [Foundation and configuration](./foundation-configuration.md)
- [Config and validation map](../references/config-and-validation-map.md)
- [Prettier and tooling notes](../references/prettier-and-tooling-notes.md)
- [markdownlint config template](../templates/markdownlint-cli2-config.template.jsonc)

## Source anchors

- [Source index and approved source families](../references/doc-source-index.md)
- [markdownlint README: configuration and inline controls](https://github.com/DavidAnson/markdownlint/blob/main/README.md#configuration)
- [markdownlint README: API config surfaces](https://github.com/DavidAnson/markdownlint/blob/main/README.md#api)
- [markdownlint README: `options.customRules`](https://github.com/DavidAnson/markdownlint/blob/main/README.md#optionscustomrules)
- [Custom rules guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/CustomRules.md)
- [Prettier coexistence guide](https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md)
