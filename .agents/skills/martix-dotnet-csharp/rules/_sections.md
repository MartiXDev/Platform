## Rule section contract

### Purpose

- Every rule file in this package uses the same section order so future
  `SKILL.md` and `AGENTS.md` files can link into them predictably.
- Keep rule content compact enough for on-demand loading while still being
  actionable on the first read.

### Required sections

1. `### Purpose`
   - Explain when to reach for the rule and what design decision it governs.
1. `### Default guidance`
   - Capture the preferred default path in short, imperative bullets.
1. `### Avoid`
   - List the anti-patterns or risky shortcuts the rule is trying to prevent.
1. `### Review checklist`
   - Provide a short verification list for reviews, implementation, or test
     planning.
1. `### Related files`
   - Link to adjacent rules or maps using descriptive relative links.
1. `### Source anchors`
   - Point to the approved research artifacts and official documentation that
     informed the rule.

### Authoring notes

- Start at H2 because page titles may be supplied by outer tooling later.
- Keep lists short and readable.
- Prefer decision-oriented bullets over long tutorial prose.
- Cross-link to maps when a rule depends on multiple Microsoft doc families.
- Mention first-pass boundaries honestly instead of pretending coverage is
  final.
