const problemSchema = {
  type: "object",
  required: ["type", "title", "status", "detail", "code", "traceId", "errors"],
  properties: {
    type: { type: "string", format: "uri-reference" },
    title: { type: "string" },
    status: { type: "integer", format: "int32" },
    detail: { type: "string" },
    instance: { type: ["string", "null"], format: "uri-reference" },
    code: { type: "string" },
    traceId: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          target: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

function ref(name) {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonResponse(description, schema, headers = {}) {
  return {
    description,
    headers,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

function problemResponse(description, status) {
  return {
    description,
    content: {
      "application/problem+json": {
        schema: ref("ProblemDetails"),
      },
    },
    "x-status": status,
  };
}

function header(description, schema, required = false) {
  return {
    description,
    required,
    schema,
  };
}

function createOrderSchemas() {
  return {
    OrderResponse: {
      type: "object",
      required: ["id", "description", "createdAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        description: { type: "string", maxLength: 200 },
        createdAt: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    OrderPage: {
      type: "object",
      required: ["items", "nextCursor", "hasMore"],
      properties: {
        items: {
          type: "array",
          items: ref("OrderResponse"),
        },
        nextCursor: { type: ["string", "null"] },
        hasMore: { type: "boolean" },
      },
      additionalProperties: false,
    },
    CreateOrderRequest: {
      type: "object",
      required: ["description"],
      properties: {
        description: { type: "string", minLength: 1, maxLength: 200 },
      },
      additionalProperties: false,
    },
    ReplaceOrderRequest: {
      type: "object",
      required: ["description"],
      properties: {
        description: { type: "string", minLength: 1, maxLength: 200 },
      },
      additionalProperties: false,
    },
  };
}

function ordersPath() {
  const pageSize = {
    name: "pageSize",
    in: "query",
    description: "The number of items to return. The maximum is 100.",
    schema: { type: "integer", format: "int32", default: 20, minimum: 1, maximum: 100 },
  };
  const filter = {
    name: "filter",
    in: "query",
    description: "An optional case-insensitive description filter.",
    schema: { type: "string", maxLength: 100 },
  };
  const sort = {
    name: "sort",
    in: "query",
    description: "The allow-listed sort field: createdAt or -createdAt.",
    schema: { type: "string", enum: ["createdAt", "-createdAt"], default: "createdAt" },
  };
  return {
    get: {
      tags: ["Orders"],
      summary: "List orders",
      operationId: "Orders_ListV1",
      parameters: [
        {
          name: "cursor",
          in: "query",
          description: "An opaque cursor scoped to the filter and sort values.",
          schema: { type: "string" },
        },
        pageSize,
        filter,
        sort,
      ],
      responses: {
        "200": jsonResponse(
          "A page of orders.",
          ref("OrderPage"),
          {
            "Cache-Control": header(
              "The explicit private cache policy for this representation.",
              { type: "string" },
              true,
            ),
          },
        ),
        "400": problemResponse("The cursor, bounds, filter, or sort is invalid.", 400),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "ListOrdersAsync",
        returnType: "OrderPage",
        queryParameters: [
          { name: "cursor", type: "string", nullable: true },
          { name: "pageSize", type: "int", nullable: true },
          { name: "filter", type: "string", nullable: true },
          { name: "sort", type: "string", nullable: true },
        ],
      },
    },
    post: {
      tags: ["Orders"],
      summary: "Create an order",
      operationId: "Orders_CreateV1",
      parameters: [
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          description: "An opaque key for safely retrying this operation.",
          schema: { type: "string", minLength: 1, maxLength: 128 },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("CreateOrderRequest"),
          },
        },
      },
      responses: {
        "201": jsonResponse(
          "The order was created.",
          ref("OrderResponse"),
          {
            Location: header("The URI of the created order.", { type: "string", format: "uri" }, true),
            ETag: header("The opaque current entity tag.", { type: "string" }, true),
          },
        ),
        "400": problemResponse("The request or idempotency key is invalid.", 400),
        "409": problemResponse("The idempotency key was reused for another request.", 409),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "CreateOrderAsync",
        returnType: "OrderResponse",
        bodyType: "CreateOrderRequest",
        headers: [{ name: "Idempotency-Key", parameterName: "idempotencyKey", type: "string" }],
      },
    },
  };
}

function orderByIdPath() {
  const id = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  };
  const ifMatch = {
    name: "If-Match",
    in: "header",
    required: true,
    description: "The opaque entity tag returned by the latest representation.",
    schema: { type: "string", minLength: 1 },
  };
  return {
    get: {
      tags: ["Orders"],
      summary: "Get an order",
      operationId: "Orders_GetV1",
      parameters: [id],
      responses: {
        "200": jsonResponse("The requested order.", ref("OrderResponse"), {
          ETag: header("The opaque current entity tag.", { type: "string" }, true),
        }),
        "404": problemResponse("The order does not exist.", 404),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "GetOrderAsync",
        returnType: "OrderResponse",
        pathParameters: [{ name: "id", type: "Guid" }],
      },
    },
    put: {
      tags: ["Orders"],
      summary: "Replace an order",
      operationId: "Orders_ReplaceV1",
      parameters: [id, ifMatch],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("ReplaceOrderRequest"),
          },
        },
      },
      responses: {
        "200": jsonResponse("The order was replaced.", ref("OrderResponse"), {
          ETag: header("The opaque current entity tag.", { type: "string" }, true),
        }),
        "400": problemResponse("The request is invalid.", 400),
        "404": problemResponse("The order does not exist.", 404),
        "412": problemResponse("The entity tag is stale.", 412),
        "428": problemResponse("If-Match is required.", 428),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "ReplaceOrderAsync",
        returnType: "OrderResponse",
        pathParameters: [{ name: "id", type: "Guid" }],
        bodyType: "ReplaceOrderRequest",
        headers: [{ name: "If-Match", parameterName: "ifMatch", type: "string" }],
      },
    },
    patch: {
      tags: ["Orders"],
      summary: "Partially update an order",
      operationId: "Orders_UpdateV1",
      parameters: [id, ifMatch],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: ref("ReplaceOrderRequest"),
          },
        },
      },
      responses: {
        "200": jsonResponse("The order was updated.", ref("OrderResponse"), {
          ETag: header("The opaque current entity tag.", { type: "string" }, true),
        }),
        "400": problemResponse("The request is invalid.", 400),
        "404": problemResponse("The order does not exist.", 404),
        "412": problemResponse("The entity tag is stale.", 412),
        "428": problemResponse("If-Match is required.", 428),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "UpdateOrderAsync",
        returnType: "OrderResponse",
        pathParameters: [{ name: "id", type: "Guid" }],
        bodyType: "ReplaceOrderRequest",
        headers: [{ name: "If-Match", parameterName: "ifMatch", type: "string" }],
      },
    },
    delete: {
      tags: ["Orders"],
      summary: "Delete an order",
      operationId: "Orders_DeleteV1",
      parameters: [id, ifMatch],
      responses: {
        "204": { description: "The order was deleted." },
        "404": problemResponse("The order does not exist.", 404),
        "412": problemResponse("The entity tag is stale.", 412),
        "428": problemResponse("If-Match is required.", 428),
        "500": problemResponse("The request failed unexpectedly.", 500),
      },
      "x-client": {
        methodName: "DeleteOrderAsync",
        returnType: null,
        pathParameters: [{ name: "id", type: "Guid" }],
        headers: [{ name: "If-Match", parameterName: "ifMatch", type: "string" }],
      },
    },
  };
}

function createBaseDocument(title, schemas, paths) {
  return {
    openapi: "3.1.0",
    info: {
      title,
      version: "1.0.0",
    },
    paths,
    components: {
      schemas: {
        ProblemDetails: problemSchema,
        ...schemas,
      },
    },
  };
}

export function createApiHttpContractDocument() {
  const legacyList = ordersPath().get;
  legacyList.operationId = "Orders_LegacyListV1";
  legacyList.deprecated = true;
  legacyList.summary = "List legacy orders";
  legacyList["x-client"] = {
    methodName: "ListLegacyOrdersAsync",
    returnType: "OrderPage",
    queryParameters: [
      { name: "cursor", type: "string", nullable: true },
      { name: "pageSize", type: "int", nullable: true },
      { name: "filter", type: "string", nullable: true },
      { name: "sort", type: "string", nullable: true },
    ],
  };
  legacyList.responses["200"].headers.Deprecation = header(
    "The RFC 9745 deprecation date.",
    { type: "string" },
    true,
  );
  legacyList.responses["200"].headers.Link = header(
    "Migration documentation for the deprecated resource.",
    { type: "string", format: "uri-reference" },
    true,
  );
  return createBaseDocument(
    "Generated API HTTP Contract",
    createOrderSchemas(),
    {
      "/api/v1/orders": ordersPath(),
      "/api/v1/orders/{id}": orderByIdPath(),
      "/api/v1/legacy-orders": { get: legacyList },
    },
  );
}

export function createModularMonolithHttpContractDocument(plan) {
  const schemas = {};
  const paths = {};
  for (const module of plan.businessModules) {
    const responseName = `${module.name}StatusResponse`;
    schemas[responseName] = {
      type: "object",
      required: ["module", "dependencies"],
      properties: {
        module: { type: "string" },
        dependencies: {
          type: "array",
          items: { type: "string" },
        },
      },
      additionalProperties: false,
    };
    paths[`/api/v1/${module.name.toLowerCase()}/status`] = {
      get: {
        tags: [module.name],
        summary: `Read ${module.name} status`,
        operationId: `${module.name}_StatusV1`,
        responses: {
          "200": jsonResponse(`The ${module.name} status.`, ref(responseName)),
          "500": problemResponse("The request failed unexpectedly.", 500),
        },
        "x-client": {
          methodName: `Get${module.name}StatusAsync`,
          returnType: responseName,
        },
      },
    };
  }

  return createBaseDocument(
    `${plan.applicationName} Modular Monolith HTTP Contract`,
    schemas,
    paths,
  );
}

function csharpIdentifier(value) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join("");
}

function csharpType(schema, nullable = false) {
  if (schema.$ref) {
    const name = schema.$ref.split("/").at(-1);
    return `${name}${nullable ? "?" : ""}`;
  }
  if (Array.isArray(schema.type)) {
    const nonNullType = schema.type.find((type) => type !== "null");
    return csharpType({ ...schema, type: nonNullType }, true);
  }
  const type = schema.type === "integer"
    ? "int"
    : schema.type === "number"
      ? "decimal"
      : schema.type === "boolean"
        ? "bool"
        : schema.format === "uuid"
          ? "Guid"
          : schema.format === "date-time"
            ? "DateTimeOffset"
            : schema.type === "array"
              ? `IReadOnlyList<${csharpType(schema.items)}>`
              : "string";
  return `${type}${nullable ? "?" : ""}`;
}

function renderSchema(name, schema) {
  const properties = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  const parameters = properties.map(([propertyName, property]) => {
    const name = csharpIdentifier(propertyName);
    const nullable = !required.has(propertyName) || property.type?.includes?.("null");
    return `    ${csharpType(property, nullable)} ${name}`;
  });
  return `public sealed record ${name}(
${parameters.join(",\n")});
`;
}

function renderClientMethod(path, method, operation) {
  const client = operation["x-client"];
  if (!client) {
    return "";
  }
  const pathParameters = client.pathParameters ?? [];
  const queryParameters = client.queryParameters ?? [];
  const headers = client.headers ?? [];
  const parameters = [
    ...pathParameters.map((parameter) => `${parameter.type} ${parameter.name}`),
    ...(client.bodyType ? [`${client.bodyType} body`] : []),
    ...headers.map((header) => `${header.type} ${header.parameterName}`),
    ...queryParameters.map(
      (parameter) =>
        `${parameter.type}${parameter.nullable ? "?" : ""} ${parameter.name}${parameter.nullable ? " = null" : ""}`,
    ),
    "CancellationToken cancellationToken = default",
  ];
  const methodBody = [
    `var request = new HttpRequestMessage(HttpMethod.${method === "delete" ? "Delete" : method === "post" ? "Post" : method === "put" ? "Put" : method === "patch" ? "Patch" : "Get"}, BuildUri("${path}"`,
  ];
  for (const parameter of pathParameters) {
    methodBody[0] += `, ${parameter.name}`;
  }
  for (const parameter of queryParameters) {
    const value = parameter.type === "string"
      ? parameter.name
      : `${parameter.name}.Value.ToString(CultureInfo.InvariantCulture)`;
    methodBody[0] += `, ${parameter.name} is null ? null : "${parameter.name}=" + Uri.EscapeDataString(${value})`;
  }
  methodBody[0] += "));";
  if (client.bodyType) {
    methodBody.push("request.Content = JsonContent.Create(body, options: JsonOptions);");
  }
  for (const header of headers) {
    methodBody.push(
      `request.Headers.TryAddWithoutValidation("${header.name}", ${header.parameterName});`,
    );
  }
  methodBody.push(
    client.returnType
      ? `return await SendAsync<${client.returnType}>(request, cancellationToken);`
      : "await SendNoContentAsync(request, cancellationToken);",
  );
  const returnType = client.returnType
    ? `Task<${client.returnType}>`
    : "Task";
  return `    public async ${returnType} ${client.methodName}(
        ${parameters.join(",\n        ")})
    {
        ${methodBody.join("\n        ")}
    }
`;
}

function renderOperationMethods(document) {
  const methods = [];
  for (const path of Object.keys(document.paths).sort()) {
    for (const method of Object.keys(document.paths[path]).sort()) {
      if (method === "parameters") {
        continue;
      }
      methods.push(renderClientMethod(path, method, document.paths[path][method]));
    }
  }
  return methods.filter(Boolean).join("\n");
}

function renderClientPathHelper(document) {
  const paths = Object.keys(document.paths).filter((path) =>
    Object.values(document.paths[path]).some((operation) =>
      operation["x-client"],
    ),
  );
  const hasPathParameters = paths.some((path) => path.includes("{"));
  if (!hasPathParameters) {
    return `    private static string BuildUri(string path, params string?[] queryValues)
    {
        var query = queryValues
            .Where(value => value is not null)
            .ToArray();
        return query.Length == 0
            ? path
            : $"{path}?{string.Join("&", query)}";
    }
`;
  }
  return `    private static string BuildUri(
        string path,
        params object?[] values)
    {
        var valueIndex = 0;
        var query = new List<string>();
        var renderedPath = Regex.Replace(
            path,
            "{([^}]+)}",
            _ => Uri.EscapeDataString(values[valueIndex++]?.ToString() ?? string.Empty));
        while (valueIndex < values.Length)
        {
            if (values[valueIndex] is string stringValue &&
                !string.IsNullOrWhiteSpace(stringValue))
            {
                query.Add(stringValue);
            }
            valueIndex++;
        }
        return query.Count == 0
            ? renderedPath
            : $"{renderedPath}?{string.Join("&", query)}";
    }
`;
}

export function renderCSharpClient(document, {
  namespace,
  className = "GeneratedApiClient",
} = {}) {
  if (document?.openapi !== "3.1.0") {
    throw new Error("The generated client requires an OpenAPI 3.1.0 document.");
  }
  if (typeof namespace !== "string" || namespace.trim().length === 0) {
    throw new Error("A client namespace is required.");
  }
  const schemas = Object.entries(document.components?.schemas ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([name]) => name !== "ProblemDetails")
    .map(([name, schema]) => renderSchema(name, schema))
    .join("\n");
  const methods = renderOperationMethods(document);
  return `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace ${namespace};

${schemas}
public sealed class ApiProblemDetailsException : Exception
{
    public ApiProblemDetailsException(
        HttpStatusCode statusCode,
        ProblemDetails problemDetails)
        : base(problemDetails.Detail)
    {
        StatusCode = statusCode;
        Problem = problemDetails;
    }

    public HttpStatusCode StatusCode { get; }

    public ProblemDetails Problem { get; }
}

public sealed record ProblemDetails(
    string Type,
    string Title,
    int Status,
    string Detail,
    string? Instance,
    string Code,
    string TraceId,
    IReadOnlyList<ProblemError> Errors);

public sealed record ProblemError(string Code, string Message, string? Target);

public sealed class ${className}
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly HttpClient client;

    public ${className}(HttpClient client)
    {
        this.client = client ?? throw new ArgumentNullException(nameof(client));
    }

${methods}
    private async Task<T> SendAsync<T>(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            await ThrowProblemAsync(response, cancellationToken);
        }

        var value = await response.Content.ReadFromJsonAsync<T>(
            JsonOptions,
            cancellationToken);
        return value ?? throw new InvalidOperationException(
            "The generated API returned an empty success body.");
    }

    private async Task SendNoContentAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        using var response = await client.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            await ThrowProblemAsync(response, cancellationToken);
        }
    }

    private static async Task ThrowProblemAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(
            JsonOptions,
            cancellationToken);
        throw new ApiProblemDetailsException(
            response.StatusCode,
            problem ?? new ProblemDetails(
                "/problems/unknown",
                "Unknown problem",
                (int)response.StatusCode,
                "The server returned an invalid problem response.",
                null,
                "client.invalid-problem",
                string.Empty,
                Array.Empty<ProblemError>()));
    }

${renderClientPathHelper(document)}
}
`;
}
