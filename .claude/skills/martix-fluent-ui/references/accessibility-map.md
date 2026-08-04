# Accessibility evidence map

## Evidence by interaction

| Interaction | Verify |
| --- | --- |
| Button or link | Correct native role, accessible name, disabled behavior, focus visibility |
| Toggle | State is exposed through checked, selected, or pressed semantics that match the control |
| Menu | Trigger relationship, arrow navigation, item roles, Escape dismissal, focus restore |
| Dialog | Label and description, modal behavior, initial focus, containment, Escape, restore |
| Combobox/listbox | Name, expanded state, active option, selection, typing model |
| Tabs | Tab and panel relationships, selected state, arrow behavior, activation model |
| Toolbar | Group label, roving focus if owned by component, disabled-item behavior |
| Data grid | Table/grid choice, header associations, selection/editing model, keyboard scope |
| Toast/status | Announcement priority, timeout, dismissal, no focus theft |
| Tooltip | Trigger discovery, supplemental relationship, no interactive content |

## Cross-cutting checks

- Keyboard-only completion
- Visible focus at 200% zoom and in forced colors
- Logical reading and focus order
- Accessible names that describe the action, not merely the icon
- Error association and announcement
- Reduced-motion behavior
- Touch target and pointer-independent operation
- Dark/high-contrast theme legibility

## Testing boundary

Automated accessibility checks catch many markup defects but do not prove keyboard
workflow, focus management, announcement timing, or understandable interaction.
Pair automated scans with explicit user-flow assertions and focused manual checks.

## Evidence

- [WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Testing Library query priority](https://testing-library.com/docs/queries/about/#priority)
