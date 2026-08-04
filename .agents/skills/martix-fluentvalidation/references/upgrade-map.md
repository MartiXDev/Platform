# FluentValidation upgrade map

## Purpose

Map the FluentValidation upgrade rules in this workstream back to the official
major-version migration guides so upgrade decisions stay tied to the breaking
changes that matter in real codebases.

## Rule coverage

- **Current supported baseline and upgrade target**
  - Rule files: `rules/upgrade-current-baseline.md`
  - Primary sources:
    - [Upgrading to 12](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html)
    - [Upgrading to 11](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html)
  - Notes: Use for deciding whether the solution can move to FluentValidation
    12, whether it must stay on 11 for runtime compatibility, and how to handle
    sync-over-async validation, cascade mode migration, and current ASP.NET
    integration implications.
- **Historical breaking changes and deprecation cleanup**
  - Rule files: `rules/upgrade-breaking-changes-history.md`
  - Primary sources:
    - [Upgrading to 12](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html)
    - [Upgrading to 11](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html)
    - [Upgrading to 10](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html)
    - [Upgrading to 9](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html)
    - [Upgrading to 8](https://docs.fluentvalidation.net/en/latest/upgrading-to-8.html)
  - Notes: Use for long-jump upgrades, especially when the codebase still uses
    deprecated validator APIs, legacy ASP.NET integration hooks, old test
    helpers, or custom validator internals that changed across 8-12.
- **Version viability and staging choices**
  - Reference files: `references/compatibility-matrix.md`
  - Primary sources:
    - [Upgrading to 12 - Changes in supported platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html#changes-in-supported-platforms)
    - [Upgrading to 11 - Changes in supported platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html#changes-in-supported-platforms)
    - [Upgrading to 9 - Supported Platforms](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html#supported-platforms)
  - Notes: Use for choosing whether to hold on 11.x as a compatibility bridge,
    take 12.x immediately, or treat 8-10 guidance as historical cleanup only.

## Review checklist

- The active rule links match the upgrade question being answered: current
  baseline vs historical cleanup.
- Runtime support decisions are checked against
  [`compatibility-matrix.md`](./compatibility-matrix.md) before recommending
  FluentValidation 12.
- Guidance for cascade mode, async validation, and ASP.NET integration is
  anchored to FluentValidation upgrade docs instead of generic .NET guidance.
- Cross-links between these references and the rule files still point to the
  right relative paths after any package reshaping.

## Related files

- [Compatibility matrix](./compatibility-matrix.md)
- [Current baseline upgrade rule](../rules/upgrade-current-baseline.md)
- [Breaking changes history rule](../rules/upgrade-breaking-changes-history.md)

## Source anchors

- [Upgrading to 12](https://docs.fluentvalidation.net/en/latest/upgrading-to-12.html)
- [Upgrading to 11](https://docs.fluentvalidation.net/en/latest/upgrading-to-11.html)
- [Upgrading to 10](https://docs.fluentvalidation.net/en/latest/upgrading-to-10.html)
- [Upgrading to 9](https://docs.fluentvalidation.net/en/latest/upgrading-to-9.html)
- [Upgrading to 8](https://docs.fluentvalidation.net/en/latest/upgrading-to-8.html)

## Maintenance notes

- Keep this map FluentValidation-specific. General ASP.NET Core hosting or
  .NET runtime lifecycle guidance belongs in broader .NET skills, not here.
- If later work adds FluentValidation coverage for testing, localization, or
  package registration beyond upgrades, link the new files here rather than
  duplicating upgrade guidance across multiple maps.
- When FluentValidation publishes a new major upgrade guide, update this map,
  the compatibility matrix, and both rule files together so the decision path
  stays coherent.
