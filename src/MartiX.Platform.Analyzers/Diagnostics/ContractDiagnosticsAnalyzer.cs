using System.Collections.Immutable;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;
using MartiX.Platform.Results;

namespace MartiX.Platform.Analyzers.Diagnostics;

/// <summary>
/// Reports contract violations that can be proved for compile-time error-code values.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ContractDiagnosticsAnalyzer : DiagnosticAnalyzer
{
    private const string ErrorTypeMetadataName = "MartiX.Platform.Results.Error";
    private const string DiagnosticCategory = "MartiX.Platform";
    private const string DiagnosticHelpLink =
        "https://github.com/MartiXDev/Platform/blob/main/docs/architecture/kernel-result-error.md#compile-time-diagnostics";

    private static readonly DiagnosticDescriptor InvalidErrorCode = new(
        id: "MXP001",
        title: "Error code does not follow the Platform contract",
        messageFormat: "Error code '{0}' must use lowercase owner-prefixed dot-separated segments",
        category: DiagnosticCategory,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Application Error codes must use lowercase owner-prefixed dot-separated segments.",
        helpLinkUri: DiagnosticHelpLink);

    private static readonly DiagnosticDescriptor ReservedErrorCode = new(
        id: "MXP002",
        title: "Error code uses the reserved Platform prefix",
        messageFormat: "Error code '{0}' uses the reserved 'platform.' prefix",
        category: DiagnosticCategory,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "The platform.* error-code prefix is reserved for Platform-owned errors.",
        helpLinkUri: DiagnosticHelpLink);

    /// <summary>Gets the diagnostics reported by this analyzer.</summary>
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(InvalidErrorCode, ReservedErrorCode);

    /// <summary>Registers the operation analysis used by this analyzer.</summary>
    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeInvocation, OperationKind.Invocation);
    }

    private static void AnalyzeInvocation(OperationAnalysisContext context)
    {
        var invocation = (IInvocationOperation)context.Operation;
        if (!IsErrorCreate(invocation, context.Compilation)
            || !TryGetConstantErrorCode(invocation, out var code))
        {
            return;
        }

        var location = GetCodeLocation(invocation);
        if (ErrorCodeContract.IsReservedPlatformCode(code))
        {
            context.ReportDiagnostic(
                Diagnostic.Create(ReservedErrorCode, location, code));
            return;
        }

        if (!ErrorCodeContract.IsValidErrorCode(code))
        {
            context.ReportDiagnostic(
                Diagnostic.Create(InvalidErrorCode, location, code));
        }
    }

    private static bool IsErrorCreate(
        IInvocationOperation invocation,
        Compilation compilation)
    {
        var method = invocation.TargetMethod;
        var errorType = compilation.GetTypeByMetadataName(ErrorTypeMetadataName);

        return method.IsStatic
            && method.Name == "Create"
            && SymbolEqualityComparer.Default.Equals(method.ContainingType, errorType);
    }

    private static bool TryGetConstantErrorCode(
        IInvocationOperation invocation,
        out string code)
    {
        var codeArgument = invocation.Arguments.FirstOrDefault(
            argument => argument.Parameter?.Name == "code");
        if (codeArgument?.Value.ConstantValue is
            { HasValue: true, Value: string constantCode })
        {
            code = constantCode;
            return true;
        }

        code = string.Empty;
        return false;
    }

    private static Location GetCodeLocation(IInvocationOperation invocation)
    {
        return invocation.Arguments
            .First(argument => argument.Parameter?.Name == "code")
            .Value.Syntax.GetLocation();
    }
}
