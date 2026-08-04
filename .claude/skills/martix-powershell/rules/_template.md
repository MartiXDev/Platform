# {Rule title}

Replace `{Rule title}` with a narrow PowerShell cmdlet topic such as base
class selection, parameter validation, pipeline input processing, or error
record construction.

## Purpose

State the decision this rule protects and the boundary it covers.

## Default guidance

- Describe the preferred PowerShell SDK default.
- Add one or more concrete guardrails.
- Call out any expected integration with module packaging, parameter binding,
  or error pipeline when relevant.

## Avoid

- List anti-patterns that break the preferred cmdlet shape.
- Include parameter, lifecycle, or error-handling ownership mistakes that
  reviewers should catch.

## Review checklist

- [ ] Cmdlet responsibilities stay inside the intended layer.
- [ ] Pipeline processing methods, parameter attributes, or error records are
      used intentionally.
- [ ] ShouldProcess, error handling, and module export assumptions are explicit.
- [ ] Confirmation, validation, and output coverage are considered when the
      topic requires them.

## Related files

- Link sibling rules, templates, or future reference maps.

## Source anchors

- Link authoritative Microsoft PowerShell-Docs and API reference documentation
  with descriptive text.
