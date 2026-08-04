# FluentValidation installation and versioning baseline

## Purpose

Set the default baseline for bringing FluentValidation into a project and for
handling the version boundary that the official installation docs call out.

## Default guidance

- Install the core package with the package name the FluentValidation docs use:
  `FluentValidation`.
- Use one of the documented install paths:
  `Install-Package FluentValidation` in the NuGet package manager console or
  `dotnet add package FluentValidation` from the CLI.
- Treat the official `latest` installation page as the baseline for new
  foundation guidance in this workstream. At the time of these docs, the page
  explicitly calls out upgrading to FluentValidation 12 as a version boundary.
- If a repository is upgrading from an older FluentValidation version, stop and
  review the upgrade guidance before applying current examples unchanged. The
  installation page explicitly directs upgraders to do this.
- Keep this foundation rule scoped to the core FluentValidation package and core
  validator APIs. Do not mix in host-specific integration guidance here when the
  source page only establishes the package installation baseline.
- Be precise about runtime/version claims. The installation page in scope gives
  the package install command and upgrade boundary, but not a detailed runtime
  support matrix, so avoid inventing unsupported TFM or host guarantees in this
  rule.

## Avoid

- Do not document alternate package names when the source page only installs
  `FluentValidation`.
- Do not skip the upgrade boundary for older solutions; the official
  installation page explicitly sends FluentValidation 12 upgraders to the
  upgrade notes.
- Do not treat installation guidance as proof of a broader runtime support
  matrix that is not stated on the cited source page.
- Do not overload this rule with ASP.NET Core registration or DI guidance; that
  belongs in separate, explicitly sourced rules.

## Review checklist

- [ ] The guidance installs the `FluentValidation` package using one of the
      documented commands.
- [ ] The rule preserves the upgrade boundary called out on the installation
      page for older versions.
- [ ] Version/runtime statements stay limited to what the cited source supports.
- [ ] Cross-links point readers to validator-authoring and collection guidance
      instead of duplicating it here.

## Related files

- [FluentValidation foundation map](../references/foundation-map.md)
- [Validator basics](./foundation-validator-basics.md)
- [Collections and composition](./foundation-collections-composition.md)

## Source anchors

- [FluentValidation installation](https://docs.fluentvalidation.net/en/latest/installation.html)
  - Documents `Install-Package FluentValidation`, `dotnet add package FluentValidation`,
    and the upgrade note for FluentValidation 12.
