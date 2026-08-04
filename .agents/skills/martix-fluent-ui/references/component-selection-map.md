# Component selection map

## Selection sequence

1. Describe the user interaction and state model without naming a component.
2. Find the matching current Fluent Storybook component.
3. Confirm semantics, keyboard behavior, focus, and responsive constraints.
4. Use public props, slots, and compound components.
5. Compose primitives only when no public component owns the interaction.

## Common routes

| Need | Start with | Avoid |
| --- | --- | --- |
| Immediate action | `Button`, `MenuButton`, or `SplitButton` by action model | Clickable `div`; menu semantics on every dropdown-looking control |
| Binary form value | `Checkbox` or `Switch` by meaning | Toggle buttons for form settings without a pressed-state contract |
| One choice from a small visible set | `RadioGroup` | Custom roving focus without need |
| Text or numeric input | Fluent field and input controls | Placeholder-only labels |
| Commands in a compact group | `Toolbar` and toolbar controls | Independent tab stops if the Fluent toolbar owns arrow navigation |
| Contextual commands | `Menu` compound components | Popover with hand-built menu roles |
| Modal task | `Dialog` compound components | Generic overlay with manual focus trap |
| Supplemental anchored content | `Popover` or `Tooltip` by interaction | Tooltip for interactive content |
| One selection from a list | `Dropdown` or `Combobox` by typing/search need | Native-looking custom popup without listbox behavior |
| Tabs between related views | `TabList` and `Tab` | Buttons with visual underline only |
| Hierarchical navigation | Current `Tree` package if requirements match | Nested lists with incomplete tree keyboard behavior |
| Tabular data | `DataGrid` when its interaction fits | Applying `grid` semantics to a static table |
| Status or feedback | Current badge, message, toast, or alert surface by urgency | Using color or icon alone |

## Slots and compound components

- Slot content changes a documented subpart while preserving the owning component.
- Compound components expose structure that must remain coordinated.
- Shorthand is convenient but must not hide an accessible name or required prop.
- Event composition must preserve both wrapper and consumer behavior unless the
  public contract explicitly allows cancellation.

## Advanced recomposition gate

Use `_unstable` state/render APIs only when all are true:

- public props, slots, and compound components cannot express the requirement;
- the installed version exports the exact API;
- the dependency is isolated behind one adapter;
- accessibility behavior remains owned and tested;
- upgrade risk is documented.

## Evidence

- [Fluent UI React Storybook](https://react.fluentui.dev/)
- [WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
