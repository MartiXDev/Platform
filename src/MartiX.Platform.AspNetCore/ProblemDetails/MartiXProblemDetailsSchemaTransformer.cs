using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace MartiX.Platform.AspNetCore;

internal sealed class MartiXProblemDetailsSchemaTransformer
    : IOpenApiSchemaTransformer
{
    public Task TransformAsync(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        if (context.JsonTypeInfo.Type != typeof(ProblemDetails))
        {
            return Task.CompletedTask;
        }

        schema.Description =
            "RFC 9457 Problem Details with stable MartiX error extensions.";
        schema.Properties ??= new Dictionary<string, IOpenApiSchema>(
            StringComparer.Ordinal);
        schema.Properties["code"] = new OpenApiSchema
        {
            Type = JsonSchemaType.String,
            Description = "The stable machine-readable primary error code.",
        };
        schema.Properties["traceId"] = new OpenApiSchema
        {
            Type = JsonSchemaType.String,
            Description = "The trace identifier for server-side diagnostics.",
        };
        schema.Properties["errors"] = new OpenApiSchema
        {
            Type = JsonSchemaType.Array,
            Description = "Safe subordinate application errors.",
            Items = new OpenApiSchema
            {
                Type = JsonSchemaType.Object,
                Properties = new Dictionary<string, IOpenApiSchema>(
                    StringComparer.Ordinal)
                {
                    ["code"] = new OpenApiSchema
                    {
                        Type = JsonSchemaType.String,
                    },
                    ["message"] = new OpenApiSchema
                    {
                        Type = JsonSchemaType.String,
                    },
                    ["target"] = new OpenApiSchema
                    {
                        Type = JsonSchemaType.String,
                    },
                },
                Required = new HashSet<string>(
                    new[] { "code", "message" },
                    StringComparer.Ordinal),
            },
        };
        schema.Required ??= new HashSet<string>(StringComparer.Ordinal);
        schema.Required.Add("code");
        schema.Required.Add("traceId");
        schema.Required.Add("errors");

        return Task.CompletedTask;
    }
}
