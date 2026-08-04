# {Rule title}

Replace `{Rule title}` with a narrow FastEndpoints topic such as endpoint
contracts, validators, or processors.

## Purpose

State the decision this rule protects and the boundary it covers.

## Default guidance

- Describe the preferred FastEndpoints default.
- Add one or more concrete guardrails.
- Call out any expected integration with ASP.NET Core, authentication, or
  observability when relevant.

## Avoid

- List anti-patterns that break the preferred endpoint shape.
- Include transport or validation ownership mistakes that reviewers should catch.

## Review checklist

- [ ] Endpoint responsibilities stay inside the intended layer.
- [ ] Validators, preprocessors, or postprocessors are used intentionally.
- [ ] Route, versioning, and response behavior stay explicit.
- [ ] Diagnostics, auth, and tests are covered when the topic requires them.

## Related files

- Link sibling rules, templates, or future reference maps.

## Source anchors

- Link authoritative FastEndpoints and platform documentation with descriptive
  text.
