# Comparison matrix template

## Purpose

Use this template when comparing upstream markdownlint behavior, repo-local
overlays, formatter or toolchain guidance, or this package against another
Markdown guidance surface.

## Matrix

| Topic or capability | Upstream markdownlint | Repo-local overlay or comparison surface | Current package surface | Gap or action |
| --- | --- | --- | --- | --- |
| Example topic | `MD022` heading spacing default | Repo keeps first-heading optional | [Default rule profile](../references/default-rule-profile.md) | Future structure rule |

## Comparison notes

- Keep comparisons factual and source-linked.
- State whether the delta belongs in a grouped rule, reference memo, template,
  or config sample.
- Keep formatter and toolchain comparisons narrow. For example, compare
  Prettier coexistence or custom-rule loading only when the topic actually
  needs it.
