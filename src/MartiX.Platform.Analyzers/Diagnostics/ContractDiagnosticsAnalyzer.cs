using System;
using System.Collections.Immutable;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace MartiX.Platform.Analyzers.Diagnostics;

/// <summary>
/// Reports contract violations that can be proved for compile-time error-code values.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ContractDiagnosticsAnalyzer : DiagnosticAnalyzer
{
    private const string ErrorTypeName = "MartiX.Platform.Results.Error";
    private const string ReservedPlatformPrefix = "platform.";

    private static readonly DiagnosticDescriptor InvalidErrorCode = new(
        id: "MXP001",
        title: "Error code does not follow the Platform contract",
        messageFormat: "Error code '{0}' must use lowercase owner-prefixed dot-separated segments",
        category: "MartiX.Platform",
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Application Error codes must use lowercase owner-prefixed dot-separated segments.",
        helpLinkUri: "https://github.com/MartiXDev/Platform/blob/main/docs/architecture/kernel-result-error.md#compile-time-diagnostics");

    private static readonly DiagnosticDescriptor ReservedErrorCode = new(
        id: "MXP002",
        title: "Error code uses the reserved Platform prefix",
        messageFormat: "Error code '{0}' uses the reserved 'platform.' prefix",
        category: "MartiX.Platform",
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "The platform.* error-code prefix is reserved for Platform-owned errors.",
        helpLinkUri: "https://github.com/MartiXDev/Platform/blob/main/docs/architecture/kernel-result-error.md#compile-time-diagnostics");

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
        if (!IsErrorCreate(invocation.TargetMethod))
        {
            return;
        }

        var codeArgument = invocation.Arguments.FirstOrDefault(
            argument => argument.Parameter?.Name == "code");
        if (codeArgument is null
            || !codeArgument.Value.ConstantValue.HasValue
            || codeArgument.Value.ConstantValue.Value is not string code)
        {
            return;
        }

        var location = codeArgument.Value.Syntax.GetLocation();
        if (code.StartsWith(ReservedPlatformPrefix, StringComparison.Ordinal))
        {
            context.ReportDiagnostic(
                Diagnostic.Create(ReservedErrorCode, location, code));
            return;
        }

        if (!IsValidCode(code))
        {
            context.ReportDiagnostic(
                Diagnostic.Create(InvalidErrorCode, location, code));
        }
    }

    private static bool IsErrorCreate(IMethodSymbol method)
    {
        return method.IsStatic
            && method.Name == "Create"
            && method.ContainingType?.ToDisplayString() == ErrorTypeName;
    }

    private static bool IsValidCode(string code)
    {
        var segmentCount = 1;
        var segmentLength = 0;
        var previousWasHyphen = false;

        foreach (var character in code)
        {
            if (character == '.')
            {
                if (!IsValidSegmentEnd(segmentLength, previousWasHyphen))
                {
                    return false;
                }

                segmentCount++;
                segmentLength = 0;
                previousWasHyphen = false;
                continue;
            }

            if (character == '-')
            {
                if (segmentLength == 0 || previousWasHyphen)
                {
                    return false;
                }

                segmentLength++;
                previousWasHyphen = true;
                continue;
            }

            if (!IsLowercaseAsciiLetterOrDigit(character))
            {
                return false;
            }

            segmentLength++;
            previousWasHyphen = false;
        }

        return IsValidSegmentEnd(segmentLength, previousWasHyphen)
            && segmentCount >= 2;
    }

    private static bool IsValidSegmentEnd(int segmentLength, bool previousWasHyphen)
    {
        return segmentLength > 0 && !previousWasHyphen;
    }

    private static bool IsLowercaseAsciiLetterOrDigit(char character)
    {
        return character is >= 'a' and <= 'z'
            or >= '0' and <= '9';
    }
}
