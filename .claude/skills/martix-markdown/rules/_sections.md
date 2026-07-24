# Rule section contract

## Purpose

Use this section contract when adding a grouped markdownlint rule file under
`rules/` so the package keeps a stable review shape as the domain library grows.

## Section order

1. `## Purpose`
1. `## Upstream default`
1. `## Repo-local overlay`
1. `## Avoid`
1. `## Review checklist`
1. `## Related files`
1. `## Source anchors`

## Authoring notes

- Start with an H1 title that names one grouped markdownlint domain or a stable
  sub-domain.
- State upstream markdownlint behavior first. Keep rule IDs, aliases, tags, and
  option surfaces in `## Upstream default`.
- Use `## Repo-local overlay` only for repository-specific instructions that
  materially change authoring or review in this repository.
- Say `No repo-local overlay.` when a domain has no additional overlay guidance
  instead of copying generic Markdown advice into that section.
- Keep toolchain coexistence guidance narrow when Prettier, suppressions, or
  custom rules are involved.

## Drafting prompts

- Which markdownlint rule IDs, aliases, or tags are the core of this domain?
- What is the upstream default, and which approved source proves it?
- Is there a repo-local overlay, or should the rule say there is none?
- Which configs, references, or sibling domains need cross-links?
