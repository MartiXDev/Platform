# PowerShell cmdlet foundation — project and module shape

## Purpose

Protect the assembly structure, project file configuration, DLL naming, `.psd1`
module manifest, and `Import-Module` wiring for binary cmdlet modules. Incorrect
project shape or a missing manifest causes load failures and broken tab
completion.

## Default guidance

- **Target a framework compatible with the minimum supported PowerShell
  version.** Binary modules are not cross-version portable at the assembly
  level.

  | Minimum PowerShell version | Recommended `TargetFramework` |
  | --- | --- |
  | PowerShell 7.4+ | `net8.0` |
  | PowerShell 7.2 | `net6.0` |
  | Windows PowerShell 5.1 only | `net472` or `net48` |

  Multi-targeting (`<TargetFrameworks>net8.0;net472</TargetFrameworks>`) is
  possible and required for modules that must run on both Windows PowerShell
  and PowerShell 7+.

- **Reference `System.Management.Automation` as a framework/SDK dependency,
  never as a bundled DLL.** Two patterns are approved:

  - **PowerShell Standard Library** — cross-version compile target, does not
    ship in the output:
    ```xml
    <PackageReference Include="PowerShellStandard.Library" Version="5.1.0"
                      PrivateAssets="all" />
    ```
  - **Microsoft.PowerShell.SDK** — full SDK for a specific PS version; mark
    all assets private so the SMA DLL is excluded from publish output:
    ```xml
    <PackageReference Include="Microsoft.PowerShell.SDK" Version="7.4.*"
                      PrivateAssets="all" />
    ```

  PowerShell loads SMA from the host process. A bundled copy causes version
  conflicts and prevents the module from loading correctly.

- **Name the DLL output to match the module name.** Set `<AssemblyName>` in
  the project file when the default csproj name differs from the intended
  module name. Consistent naming makes `RootModule` in the manifest
  unambiguous.

- **Create a `.psd1` module manifest with these fields populated:**

  | Field | Requirement |
  | --- | --- |
  | `RootModule` | Path to the compiled DLL (e.g., `'MyModule.dll'`); relative to the manifest |
  | `ModuleVersion` | Semantic version string (e.g., `'1.0.0'`) |
  | `PowerShellVersion` | Minimum compatible PS version (e.g., `'7.2'`) |
  | `CmdletsToExport` | Explicit array of cmdlet names exported by the module |
  | `GUID` | A unique module GUID; generate once and do not change |
  | `Author` | Module author name |
  | `Description` | Human-readable module description |

  ```powershell
  @{
      RootModule        = 'MyModule.dll'
      ModuleVersion     = '1.0.0'
      GUID              = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      Author            = 'MartiXDev'
      Description       = 'Compiled cmdlet module for ...'
      PowerShellVersion = '7.2'
      CmdletsToExport   = @('Get-Widget', 'Set-Widget', 'Remove-Widget')
  }
  ```

- **Load the module via the `.psd1` manifest during development and testing.**
  Use `Import-Module -Path '.\MyModule\MyModule.psd1' -Force` to reload after
  each build. Using `-Force` replaces the already-loaded module in the session.

- **Separate the project output folder from the manifest folder when the build
  places DLLs in a subdirectory.** A common pattern is to copy the manifest
  into the build output folder as a post-build step, or to place the manifest
  at the project root with `RootModule = 'bin\Release\net8.0\MyModule.dll'`.

## Avoid

- **Missing `CmdletsToExport` or using `'*'` in production.** A wildcard
  export discovers cmdlets at module load time, which is slower and prevents
  PowerShell from building a reliable tab-completion index before the module
  loads. List cmdlet names explicitly.

- **Bundling `System.Management.Automation.dll` in the output directory.**
  The host already has SMA loaded; a second copy causes type-identity mismatches
  that manifest as binding failures and `is` / `as` cast failures at runtime.

- **Targeting a framework newer than the running PowerShell host's .NET
  runtime.** If the host runs on .NET 6 and the module targets `net8.0`, the
  module will fail to load. Align `TargetFramework` with the `$PSVersionTable`
  `.PSEdition` and `.PSVersion` of the minimum supported host.

- **Using `FunctionsToExport` for compiled cmdlets.** `FunctionsToExport`
  is for script functions in `.psm1` files. Compiled cmdlets must appear in
  `CmdletsToExport`.

- **Leaving `RootModule` empty.** An empty `RootModule` makes the manifest
  a script module with no binary cmdlets loaded, even if a DLL is present in
  the same directory.

- **Using a `NestedModules` array to load the binary cmdlet DLL without
  setting `RootModule`.** The `RootModule` approach is the canonical pattern;
  `NestedModules` for the primary DLL creates an extra module layer that
  complicates removal and upgrade.

## Review checklist

- [ ] Project targets a `TargetFramework` compatible with the minimum supported
      PowerShell version.
- [ ] `System.Management.Automation` (or PowerShell SDK) is referenced with
      `PrivateAssets="all"` so it is not bundled in publish output.
- [ ] `.psd1` manifest declares `RootModule` pointing to the compiled DLL.
- [ ] `CmdletsToExport` lists every exported cmdlet name explicitly.
- [ ] `ModuleVersion`, `GUID`, `Author`, `Description`, and
      `PowerShellVersion` are populated in the manifest.
- [ ] `FunctionsToExport`, `AliasesToExport`, and `VariablesToExport` are set
      to `@()` (empty) when there are no script-layer exports.
- [ ] `Import-Module` path during testing resolves to the `.psd1` manifest.

## Related files

- [Foundation — base class and attribute](./foundation-base-class-attribute.md)
- [Foundation map](../references/foundation-map.md)
- [Source index and guardrails](../references/doc-source-index.md)

## Source anchors

- [Writing a binary module](https://learn.microsoft.com/en-us/powershell/scripting/developer/module/how-to-write-a-powershell-binary-module)
- [Module manifest overview](https://learn.microsoft.com/en-us/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest)
- [Module manifest keys reference](https://learn.microsoft.com/en-us/powershell/scripting/developer/module/how-to-write-a-powershell-module-manifest)
- [Strongly encouraged development guidelines](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/strongly-encouraged-development-guidelines)
- [PowerShell Standard Library (NuGet)](https://www.nuget.org/packages/PowerShellStandard.Library)
- [Microsoft.PowerShell.SDK (NuGet)](https://www.nuget.org/packages/Microsoft.PowerShell.SDK)
