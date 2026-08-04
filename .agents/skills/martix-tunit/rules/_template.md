# {Rule title}

Replace `{Rule title}` with a narrow TUnit topic such as lifecycle hooks,
data-driven test attributes, or assertion patterns.

## Purpose

State the decision this rule protects and the boundary it covers.

## Default guidance

- Describe the preferred TUnit default.
- Add one or more concrete guardrails.
- Call out any expected integration with .NET hosting, DI, or
  observability when relevant.

## Avoid

- List anti-patterns that break the preferred test shape.
- Include lifecycle or data-source ownership mistakes that reviewers
  should catch.

## Review checklist

- [ ] Test responsibilities stay inside the intended layer.
- [ ] Lifecycle hooks, fixtures, or data sources are used intentionally.
- [ ] Parallelism and ordering assumptions are explicit.
- [ ] DI, assertions, and integration coverage are considered when the
      topic requires them.

## Related files

- Link sibling rules, templates, or future reference maps.

## Source anchors

- Link authoritative TUnit documentation and platform documentation with
  descriptive text.
