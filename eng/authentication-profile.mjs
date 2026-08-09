const DEFAULT_AUTHENTICATION_PROFILE = "none";

export const AUTHENTICATION_PROFILE_MATRIX = Object.freeze({
  none: Object.freeze({
    id: "none",
    provider: "none",
    flow: "anonymous",
    requiresPersistence: false,
    packages: Object.freeze([]),
  }),
  "identity:interactive": Object.freeze({
    id: "identity:interactive",
    provider: "identity",
    flow: "interactive",
    requiresPersistence: true,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Identity.EntityFrameworkCore",
        version: "10.0.10",
      }),
    ]),
  }),
  "oidc:interactive": Object.freeze({
    id: "oidc:interactive",
    provider: "oidc",
    flow: "interactive",
    requiresPersistence: false,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Authentication.OpenIdConnect",
        version: "10.0.10",
      }),
    ]),
  }),
  "oidc:api": Object.freeze({
    id: "oidc:api",
    provider: "oidc",
    flow: "api",
    requiresPersistence: false,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Authentication.JwtBearer",
        version: "10.0.10",
      }),
    ]),
  }),
  "entra:interactive": Object.freeze({
    id: "entra:interactive",
    provider: "entra",
    flow: "interactive",
    requiresPersistence: false,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Authentication.OpenIdConnect",
        version: "10.0.10",
      }),
    ]),
  }),
  "entra:api-delegated": Object.freeze({
    id: "entra:api-delegated",
    provider: "entra",
    flow: "api-delegated",
    requiresPersistence: false,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Authentication.JwtBearer",
        version: "10.0.10",
      }),
    ]),
  }),
  "entra:api-application": Object.freeze({
    id: "entra:api-application",
    provider: "entra",
    flow: "api-application",
    requiresPersistence: false,
    packages: Object.freeze([
      Object.freeze({
        id: "Microsoft.AspNetCore.Authentication.JwtBearer",
        version: "10.0.10",
      }),
    ]),
  }),
});

export const AUTHENTICATION_PROFILE_IDS = Object.freeze(
  Object.keys(AUTHENTICATION_PROFILE_MATRIX),
);

const PROFILE_ALIASES = new Set(["identity", "oidc", "entra"]);
const PROFILE_OPTION_NAMES = [
  "authenticationProfile",
  "authentication",
  "auth",
  "authProfile",
  "identityProfile",
];
const IDENTITY_MIGRATION_TYPES = Object.freeze({
  postgresql: Object.freeze({
    identifier: "uuid",
    integer: "integer",
    boolean: "boolean",
    shortText: "character varying(128)",
    text: "text",
    text256: "character varying(256)",
    timestamp: "timestamp with time zone",
  }),
  sqlserver: Object.freeze({
    identifier: "uniqueidentifier",
    integer: "int",
    boolean: "bit",
    shortText: "nvarchar(128)",
    text: "nvarchar(max)",
    text256: "nvarchar(256)",
    timestamp: "datetimeoffset",
  }),
});

function failWith(message, fail) {
  if (typeof fail === "function") {
    fail(message);
  }
  throw new Error(message);
}

function normalizeProfileValue(value, label, fail) {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return failWith(`${label} must be a non-empty string.`, fail);
    }
    return normalized;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.provider === "string" &&
    typeof value.flow === "string"
  ) {
    const provider = value.provider.trim();
    const flow = value.flow.trim();
    if (provider.length === 0 || flow.length === 0) {
      return failWith(
        `${label} provider and flow must be non-empty strings.`,
        fail,
      );
    }
    return `${provider}:${flow}`;
  }

  return failWith(
    `${label} must be an explicit profile string or { provider, flow } object.`,
    fail,
  );
}

function resolveProfileAlias(value, label, fail) {
  const normalized = normalizeProfileValue(value, label, fail);
  if (PROFILE_ALIASES.has(normalized)) {
    failWith(
      `Authentication profile "${normalized}" is ambiguous; select its explicit interactive or API flow.`,
      fail,
    );
  }
  return normalized;
}

export function resolveAuthenticationProfile(
  options,
  { preset, persistence = "none", fail } = {},
) {
  const supplied = [];
  for (const optionName of PROFILE_OPTION_NAMES) {
    if (options?.[optionName] !== undefined) {
      supplied.push(
        resolveProfileAlias(
          options[optionName],
          optionName,
          fail,
        ),
      );
    }
  }

  let profileId = DEFAULT_AUTHENTICATION_PROFILE;
  if (supplied.length > 0) {
    profileId = supplied[0];
    if (supplied.some((value) => value !== profileId)) {
      failWith(
        "Conflicting authentication profile selections are not allowed.",
        fail,
      );
    }
  }

  const provider = options?.authenticationProvider;
  const flow = options?.authenticationFlow;
  if (provider !== undefined || flow !== undefined) {
    if (provider === undefined || flow === undefined) {
      failWith(
        "authenticationProvider and authenticationFlow must be selected together.",
        fail,
      );
    }
    const composed = resolveProfileAlias(
      provider === "none" && flow === "anonymous"
        ? "none"
        : `${provider}:${flow}`,
      "authenticationProvider/authenticationFlow",
      fail,
    );
    if (supplied.length > 0 && composed !== profileId) {
      failWith(
        "Conflicting authentication profile selections are not allowed.",
        fail,
      );
    }
    profileId = composed;
  }

  const definition = AUTHENTICATION_PROFILE_MATRIX[profileId];
  if (definition === undefined) {
    failWith(
      `Authentication profile "${profileId}" is not supported. Select one of ${AUTHENTICATION_PROFILE_IDS.join(", ")}.`,
      fail,
    );
  }
  if (definition.requiresPersistence && persistence !== "relational") {
    failWith(
      `Authentication profile "${profileId}" requires relational persistence.`,
      fail,
    );
  }
  if (definition.id === "identity:interactive" && preset === "api") {
    failWith(
      "The api preset cannot host local Identity because it does not provide relational persistence.",
      fail,
    );
  }

  return {
    profile: definition.id,
    provider: definition.provider,
    flow: definition.flow,
    state: "selected",
  };
}

export function authenticationPackageReferences(authentication) {
  const definition = AUTHENTICATION_PROFILE_MATRIX[authentication.profile];
  if (definition === undefined) {
    throw new Error(`Unknown authentication profile: ${authentication.profile}.`);
  }
  return definition.packages.map((reference) => ({ ...reference }));
}

export function authenticationManifest(authentication) {
  return {
    profile: authentication.profile,
    provider: authentication.provider,
    flow: authentication.flow,
    state: authentication.state,
  };
}

function identityMigrationTypes(relationalProvider) {
  const types = IDENTITY_MIGRATION_TYPES[relationalProvider];
  if (types === undefined) {
    throw new Error(
      `Unknown relational provider: ${relationalProvider}.`,
    );
  }
  return types;
}

function renderPermissionAuthorization() {
  return `    public const string PermissionPolicyName = "permission:platform-access";

    public static void AddAuthorization(
        IServiceCollection services)
    {
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddAuthorizationBuilder()
            .AddPolicy(
                PermissionPolicyName,
                policy => policy
                    .RequireAuthenticatedUser()
                    .AddRequirements(
                        new PermissionAuthorizationRequirement(
                            Permission.Create("platform.access"))));
    }

    private sealed class PermissionAuthorizationRequirement : IAuthorizationRequirement
    {
        public PermissionAuthorizationRequirement(Permission permission)
        {
            Permission = permission;
        }

        public Permission Permission { get; }
    }

    private sealed class PermissionAuthorizationHandler :
        AuthorizationHandler<PermissionAuthorizationRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionAuthorizationRequirement requirement)
        {
            if (ActorAuthorization.Resolve(
                    context.User,
                    Profile == "identity:interactive" ? "identity" : null)
                .Authorize(requirement.Permission)
                .IsAllowed)
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
`;
}

function renderConfigurationValidation(authentication) {
  if (authentication.profile === "none") {
    return "";
  }

  if (authentication.profile === "identity:interactive") {
    return `        RequireConfiguration(
            configuration,
            "ConnectionStrings:Database");
`;
  }

  const common = `        _ = RequireHttpsUri(
            configuration,
            "Authentication:Authority");
`;
  if (authentication.flow === "interactive") {
   return `${common}        RequireConfiguration(
            configuration,
            "Authentication:ClientId");
        RequireConfiguration(
            configuration,
            "Authentication:ClientSecretReference");
        RequireConfiguration(
            configuration,
            "Authentication:ClientSecret");
`;
  }

  const scopeOrRole =
    authentication.flow === "api-application"
      ? "Authentication:RequiredAppRole"
      : "Authentication:RequiredScope";
  return `${common}        RequireConfiguration(
            configuration,
            "Authentication:Audience");
        RequireConfiguration(
            configuration,
            "${scopeOrRole}");
`;
}

function renderProviderRegistration(plan) {
  const { authentication } = plan;
  if (authentication.profile === "none") {
    return "";
  }
  if (authentication.profile === "identity:interactive") {
    const persistenceMethod =
      plan.relationalProvider === "sqlserver" ? "UseSqlServer" : "UseNpgsql";
    return `        services.AddDbContext<IdentityDbContext>(options =>
            options.${persistenceMethod}(
                configuration.GetConnectionString("Database")
                    ?? throw new InvalidOperationException(
                        "ConnectionStrings:Database is required.")));
        services.AddIdentityCore<IdentityUser<Guid>>()
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<IdentityDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();
        services.AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddIdentityCookies();
`;
  }
  if (authentication.flow === "interactive") {
    return `        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme =
                CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultSignInScheme =
                CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme =
                OpenIdConnectDefaults.AuthenticationScheme;
        })
            .AddCookie(options =>
            {
                options.Cookie.Name = "martix.session";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
            })
            .AddOpenIdConnect(options =>
            {
                options.Authority = RequireHttpsUri(
                    configuration,
                    "Authentication:Authority");
                options.ClientId = RequireConfiguration(
                    configuration,
                    "Authentication:ClientId");
                options.ClientSecret = RequireConfiguration(
                    configuration,
                    "Authentication:ClientSecret");
                options.ResponseType = "code";
                options.UsePkce = true;
                options.SaveTokens = false;
                options.GetClaimsFromUserInfoEndpoint = false;
            });
`;
  }

  const requirement =
    authentication.flow === "api-application"
      ? "Authentication:RequiredAppRole"
      : "Authentication:RequiredScope";
  const requirementClaimExpression =
    authentication.flow === "api-application"
      ? 'claim.Type == "roles"'
      : 'claim.Type is "scp" or "scope"';
  const tenantRequirement = authentication.provider === "entra"
    ? `        RequireConfiguration(
            configuration,
            "Authentication:TenantId");
`
    : "";
  return `${tenantRequirement}        services.AddAuthentication(
                JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = RequireHttpsUri(
                    configuration,
                    "Authentication:Authority");
                options.Audience = RequireConfiguration(
                    configuration,
                    "Authentication:Audience");
                options.RequireHttpsMetadata = true;
                options.MapInboundClaims = false;
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var required = RequireConfiguration(
                            configuration,
                            "${requirement}");
                        var hasRequirement = context.Principal?.Claims.Any(
                            claim => ${requirementClaimExpression}
                                && claim.Value
                                    .Split(
                                        new[] { ' ', ',' },
                                        StringSplitOptions.RemoveEmptyEntries)
                                    .Contains(
                                        required,
                                        StringComparer.Ordinal)) == true;
                        if (!hasRequirement)
                        {
                            context.Fail("The token lacks the required application authorization value.");
                        }

                        return Task.CompletedTask;
                    },
                };
            });
`;
}

function renderAuthenticationUsings(authentication) {
  switch (authentication.profile) {
    case "none":
      return "";
    case "identity:interactive":
      return `using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
`;
    default:
      if (authentication.flow === "interactive") {
        return `using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
`;
      }
      return `using Microsoft.AspNetCore.Authentication.JwtBearer;
`;
    }
}

function renderAuthenticationConfigurationHelpers(authentication) {
  if (authentication.profile === "none") {
    return "";
  }

  const helpers = [`    private static string RequireConfiguration(
        IConfiguration configuration,
        string key)
    {
        var value = configuration[key]?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Authentication configuration value '{key}' is required.");
        }

        return value;
    }
`];

  if (authentication.profile !== "identity:interactive") {
    helpers.push(`    private static string RequireHttpsUri(
        IConfiguration configuration,
        string key)
    {
        var value = RequireConfiguration(configuration, key);
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Authentication configuration value '{key}' must be an HTTPS URI.");
        }

        return uri.AbsoluteUri.TrimEnd('/');
    }
`);
  }

  return helpers.join("\n");
}

export function renderAuthenticationCompositionFile(plan) {
  const authentication = plan.authentication;
  return `using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using ${plan.applicationName}.Api.Infrastructure.Identity;
using MartiX.Platform.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
${renderAuthenticationUsings(authentication)}
namespace ${plan.applicationName}.Api.Infrastructure.Identity;

internal static class AuthenticationComposition
{
    public const string Profile = "${authentication.profile}";
    public const string Provider = "${authentication.provider}";

    public static void ValidateStartup(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);
${renderConfigurationValidation(authentication)}    }

    public static void AddServices(
        IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ValidateStartup(configuration, environment);
        services.AddHttpContextAccessor();
        services.AddScoped(serviceProvider =>
        {
            var accessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
            return ActorAuthorization.Resolve(
                accessor.HttpContext?.User,
                Profile == "identity:interactive" ? "identity" : null);
        });
${renderProviderRegistration(plan)}        AddAuthorization(services);
    }

${renderPermissionAuthorization()}${renderAuthenticationConfigurationHelpers(authentication)}}
`;
}

export function renderActorAuthorizationFile(plan) {
  return `using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MartiX.Platform.Security;

namespace ${plan.applicationName}.Api.Infrastructure.Identity;

internal static class ActorAuthorization
{
    public static ActorContext Resolve(
        ClaimsPrincipal? principal,
        string? fallbackIssuer = null)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return ActorContext.Anonymous();
        }

        var subject = principal.FindFirst("sub")?.Value?.Trim()
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim();
        var issuer = principal.FindFirst("iss")?.Value?.Trim()
            ?? fallbackIssuer?.Trim();
        if (string.IsNullOrWhiteSpace(subject)
            || string.IsNullOrWhiteSpace(issuer))
        {
            return ActorContext.Unresolved();
        }

        var key = Encoding.UTF8.GetBytes($"{issuer}\\0{subject}");
        var digest = SHA256.HashData(key);
        var actorId = ActorId.Create(new Guid(digest.AsSpan(0, 16)));
        var displayName = SafeDisplayName(
            principal.FindFirst("name")?.Value
                ?? principal.FindFirst(ClaimTypes.DisplayName)?.Value);
        return ActorContext.Create(
            ActorSnapshot.Human(actorId, displayName),
            MapPermissions(principal));
    }

    private static PermissionSet MapPermissions(ClaimsPrincipal principal)
    {
        var permissions = new List<Permission>();
        var claimCount = 0;
        foreach (var claim in principal.Claims.Where(claim =>
                     claim.Type is "permissions" or "scope" or "scp" or "roles"
                         || claim.Type == ClaimTypes.Role))
        {
            if (++claimCount > 64)
            {
                return PermissionSet.Empty;
            }

            foreach (var value in claim.Value.Split(
                         new[] { ' ', ',', ';' },
                         StringSplitOptions.RemoveEmptyEntries))
            {
                if (Permission.TryCreate(value, out var permission))
                {
                    permissions.Add(permission);
                }
            }
        }

        return PermissionSet.Create(permissions);
    }

    private static string? SafeDisplayName(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized)
            || normalized.Length > 200
            || normalized.Any(char.IsControl)
            ? null
            : normalized;
    }
}
`;
}

export function renderIdentityDbContextFile(plan) {
  return `using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ${plan.applicationName}.Api.Infrastructure.Identity;

internal sealed class IdentityDbContext :
    IdentityDbContext<IdentityUser<Guid>, IdentityRole<Guid>, Guid>
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema("identity");
    }
}
`;
}

export function renderIdentityMigrationFile(plan) {
  const types = identityMigrationTypes(plan.relationalProvider);
  const claimIdColumn = plan.relationalProvider === "sqlserver"
    ? `table.Column<int>(
                        type: "${types.integer}",
                        nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1")`
    : `table.Column<int>(
                        type: "${types.integer}",
                        nullable: false)
                    .Annotation(
                        "Npgsql:ValueGenerationStrategy",
                        NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)`;
  const roleNameUniqueIndexFilter =
    plan.relationalProvider === "sqlserver"
      ? `,
            filter: "[NormalizedName] IS NOT NULL"`
      : "";
  const userNameUniqueIndexFilter =
    plan.relationalProvider === "sqlserver"
      ? `,
            filter: "[NormalizedUserName] IS NOT NULL"`
      : "";

  return `${plan.relationalProvider === "postgresql"
    ? "using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;\n"
    : ""}using ${plan.applicationName}.Api.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ${plan.applicationName}.Api.Infrastructure.Identity.Migrations;

[DbContext(typeof(IdentityDbContext))]
[Migration("20260101000000_InitialIdentity")]
internal sealed class InitialIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(name: "identity");

        migrationBuilder.CreateTable(
            name: "AspNetRoles",
            schema: "identity",
            columns: table => new
            {
                Id = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                Name = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                NormalizedName = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                ConcurrencyStamp = table.Column<string>(
                    type: "${types.text}",
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AspNetRoles", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "AspNetUsers",
            schema: "identity",
            columns: table => new
            {
                Id = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                UserName = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                NormalizedUserName = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                Email = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                NormalizedEmail = table.Column<string>(
                    type: "${types.text256}",
                    maxLength: 256,
                    nullable: true),
                EmailConfirmed = table.Column<bool>(
                    type: "${types.boolean}",
                    nullable: false),
                PasswordHash = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                SecurityStamp = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                ConcurrencyStamp = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                PhoneNumber = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                PhoneNumberConfirmed = table.Column<bool>(
                    type: "${types.boolean}",
                    nullable: false),
                TwoFactorEnabled = table.Column<bool>(
                    type: "${types.boolean}",
                    nullable: false),
                LockoutEnd = table.Column<DateTimeOffset>(
                    type: "${types.timestamp}",
                    nullable: true),
                LockoutEnabled = table.Column<bool>(
                    type: "${types.boolean}",
                    nullable: false),
                AccessFailedCount = table.Column<int>(
                    type: "${types.integer}",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AspNetUsers", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "AspNetRoleClaims",
            schema: "identity",
            columns: table => new
            {
                Id = ${claimIdColumn},
                RoleId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                ClaimType = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                ClaimValue = table.Column<string>(
                    type: "${types.text}",
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                table.ForeignKey(
                    "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                    x => x.RoleId,
                    principalSchema: "identity",
                    principalTable: "AspNetRoles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AspNetUserClaims",
            schema: "identity",
            columns: table => new
            {
                Id = ${claimIdColumn},
                UserId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                ClaimType = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                ClaimValue = table.Column<string>(
                    type: "${types.text}",
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                table.ForeignKey(
                    "FK_AspNetUserClaims_AspNetUsers_UserId",
                    x => x.UserId,
                    principalSchema: "identity",
                    principalTable: "AspNetUsers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AspNetUserLogins",
            schema: "identity",
            columns: table => new
            {
                LoginProvider = table.Column<string>(
                    type: "${types.shortText}",
                    maxLength: 128,
                    nullable: false),
                ProviderKey = table.Column<string>(
                    type: "${types.shortText}",
                    maxLength: 128,
                    nullable: false),
                ProviderDisplayName = table.Column<string>(
                    type: "${types.text}",
                    nullable: true),
                UserId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "PK_AspNetUserLogins",
                    x => new { x.LoginProvider, x.ProviderKey });
                table.ForeignKey(
                    "FK_AspNetUserLogins_AspNetUsers_UserId",
                    x => x.UserId,
                    principalSchema: "identity",
                    principalTable: "AspNetUsers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AspNetUserRoles",
            schema: "identity",
            columns: table => new
            {
                UserId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                RoleId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "PK_AspNetUserRoles",
                    x => new { x.UserId, x.RoleId });
                table.ForeignKey(
                    "FK_AspNetUserRoles_AspNetRoles_RoleId",
                    x => x.RoleId,
                    principalSchema: "identity",
                    principalTable: "AspNetRoles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    "FK_AspNetUserRoles_AspNetUsers_UserId",
                    x => x.UserId,
                    principalSchema: "identity",
                    principalTable: "AspNetUsers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AspNetUserTokens",
            schema: "identity",
            columns: table => new
            {
                UserId = table.Column<Guid>(
                    type: "${types.identifier}",
                    nullable: false),
                LoginProvider = table.Column<string>(
                    type: "${types.shortText}",
                    maxLength: 128,
                    nullable: false),
                Name = table.Column<string>(
                    type: "${types.shortText}",
                    maxLength: 128,
                    nullable: false),
                Value = table.Column<string>(
                    type: "${types.text}",
                    nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "PK_AspNetUserTokens",
                    x => new { x.UserId, x.LoginProvider, x.Name });
                table.ForeignKey(
                    "FK_AspNetUserTokens_AspNetUsers_UserId",
                    x => x.UserId,
                    principalSchema: "identity",
                    principalTable: "AspNetUsers",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "RoleNameIndex",
            schema: "identity",
            table: "AspNetRoles",
            column: "NormalizedName",
            unique: true${roleNameUniqueIndexFilter});

        migrationBuilder.CreateIndex(
            name: "UserNameIndex",
            schema: "identity",
            table: "AspNetUsers",
            column: "NormalizedUserName",
            unique: true${userNameUniqueIndexFilter});

        migrationBuilder.CreateIndex(
            name: "EmailIndex",
            schema: "identity",
            table: "AspNetUsers",
            column: "NormalizedEmail");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "AspNetUserTokens",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetUserRoles",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetUserLogins",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetUserClaims",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetRoleClaims",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetUsers",
            schema: "identity");
        migrationBuilder.DropTable(
            name: "AspNetRoles",
            schema: "identity");
    }
}
`;
}

export function renderIdentityMigrationSnapshotFile(plan) {
  const types = identityMigrationTypes(plan.relationalProvider);
  const claimIdAnnotation = plan.relationalProvider === "sqlserver"
    ? `.HasAnnotation("SqlServer:Identity", "1, 1");`
    : `.HasAnnotation(
            "Npgsql:ValueGenerationStrategy",
            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);`;
  const providerUsing = plan.relationalProvider === "postgresql"
    ? "using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;\n"
    : "";
  const maxIdentifierLength = plan.relationalProvider === "sqlserver" ? 128 : 63;
  const roleNameUniqueIndexFilter =
    plan.relationalProvider === "sqlserver"
      ? `
                .HasFilter("[NormalizedName] IS NOT NULL")`
      : "";
  const userNameUniqueIndexFilter =
    plan.relationalProvider === "sqlserver"
      ? `
                .HasFilter("[NormalizedUserName] IS NOT NULL")`
      : "";

  return `${providerUsing}using ${plan.applicationName}.Api.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace ${plan.applicationName}.Api.Infrastructure.Identity.Migrations;

[DbContext(typeof(IdentityDbContext))]
internal partial class IdentityDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasDefaultSchema("identity")
            .HasAnnotation("ProductVersion", "10.0.10")
            .HasAnnotation("Relational:MaxIdentifierLength", ${maxIdentifierLength});

        modelBuilder.Entity<IdentityRole<Guid>>(entity =>
        {
            entity.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("${types.identifier}");
            entity.Property<string>("Name")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<string>("NormalizedName")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<string>("ConcurrencyStamp")
                .IsConcurrencyToken()
                .HasColumnType("${types.text}");
            entity.HasKey("Id")
                .HasName("PK_AspNetRoles");
            entity.HasIndex("NormalizedName")
                .IsUnique()
${roleNameUniqueIndexFilter}
                .HasDatabaseName("RoleNameIndex");
            entity.ToTable("AspNetRoles", "identity");
        });

        modelBuilder.Entity<IdentityUser<Guid>>(entity =>
        {
            entity.Property<Guid>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("${types.identifier}");
            entity.Property<string>("UserName")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<string>("NormalizedUserName")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<string>("Email")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<string>("NormalizedEmail")
                .HasMaxLength(256)
                .HasColumnType("${types.text256}");
            entity.Property<bool>("EmailConfirmed")
                .HasColumnType("${types.boolean}");
            entity.Property<string>("PasswordHash")
                .HasColumnType("${types.text}");
            entity.Property<string>("SecurityStamp")
                .HasColumnType("${types.text}");
            entity.Property<string>("ConcurrencyStamp")
                .IsConcurrencyToken()
                .HasColumnType("${types.text}");
            entity.Property<string>("PhoneNumber")
                .HasColumnType("${types.text}");
            entity.Property<bool>("PhoneNumberConfirmed")
                .HasColumnType("${types.boolean}");
            entity.Property<bool>("TwoFactorEnabled")
                .HasColumnType("${types.boolean}");
            entity.Property<DateTimeOffset>("LockoutEnd")
                .HasColumnType("${types.timestamp}");
            entity.Property<bool>("LockoutEnabled")
                .HasColumnType("${types.boolean}");
            entity.Property<int>("AccessFailedCount")
                .HasColumnType("${types.integer}");
            entity.HasKey("Id")
                .HasName("PK_AspNetUsers");
            entity.HasIndex("NormalizedEmail")
                .HasDatabaseName("EmailIndex");
            entity.HasIndex("NormalizedUserName")
                .IsUnique()
${userNameUniqueIndexFilter}
                .HasDatabaseName("UserNameIndex");
            entity.ToTable("AspNetUsers", "identity");
        });

        modelBuilder.Entity<IdentityRoleClaim<Guid>>(entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("${types.integer}")
                ${claimIdAnnotation}
            entity.Property<Guid>("RoleId")
                .HasColumnType("${types.identifier}");
            entity.Property<string>("ClaimType")
                .HasColumnType("${types.text}");
            entity.Property<string>("ClaimValue")
                .HasColumnType("${types.text}");
            entity.HasKey("Id")
                .HasName("PK_AspNetRoleClaims");
            entity.HasOne<IdentityRole<Guid>>()
                .WithMany()
                .HasForeignKey("RoleId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable("AspNetRoleClaims", "identity");
        });

        modelBuilder.Entity<IdentityUserClaim<Guid>>(entity =>
        {
            entity.Property<int>("Id")
                .ValueGeneratedOnAdd()
                .HasColumnType("${types.integer}")
                ${claimIdAnnotation}
            entity.Property<Guid>("UserId")
                .HasColumnType("${types.identifier}");
            entity.Property<string>("ClaimType")
                .HasColumnType("${types.text}");
            entity.Property<string>("ClaimValue")
                .HasColumnType("${types.text}");
            entity.HasKey("Id")
                .HasName("PK_AspNetUserClaims");
            entity.HasOne<IdentityUser<Guid>>()
                .WithMany()
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable("AspNetUserClaims", "identity");
        });

        modelBuilder.Entity<IdentityUserLogin<Guid>>(entity =>
        {
            entity.Property<string>("LoginProvider")
                .HasMaxLength(128)
                .HasColumnType("${types.shortText}");
            entity.Property<string>("ProviderKey")
                .HasMaxLength(128)
                .HasColumnType("${types.shortText}");
            entity.Property<string>("ProviderDisplayName")
                .HasColumnType("${types.text}");
            entity.Property<Guid>("UserId")
                .HasColumnType("${types.identifier}");
            entity.HasKey("LoginProvider", "ProviderKey")
                .HasName("PK_AspNetUserLogins");
            entity.HasOne<IdentityUser<Guid>>()
                .WithMany()
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable("AspNetUserLogins", "identity");
        });

        modelBuilder.Entity<IdentityUserRole<Guid>>(entity =>
        {
            entity.Property<Guid>("UserId")
                .HasColumnType("${types.identifier}");
            entity.Property<Guid>("RoleId")
                .HasColumnType("${types.identifier}");
            entity.HasKey("UserId", "RoleId")
                .HasName("PK_AspNetUserRoles");
            entity.HasOne<IdentityRole<Guid>>()
                .WithMany()
                .HasForeignKey("RoleId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<IdentityUser<Guid>>()
                .WithMany()
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable("AspNetUserRoles", "identity");
        });

        modelBuilder.Entity<IdentityUserToken<Guid>>(entity =>
        {
            entity.Property<Guid>("UserId")
                .HasColumnType("${types.identifier}");
            entity.Property<string>("LoginProvider")
                .HasMaxLength(128)
                .HasColumnType("${types.shortText}");
            entity.Property<string>("Name")
                .HasMaxLength(128)
                .HasColumnType("${types.shortText}");
            entity.Property<string>("Value")
                .HasColumnType("${types.text}");
            entity.HasKey("UserId", "LoginProvider", "Name")
                .HasName("PK_AspNetUserTokens");
            entity.HasOne<IdentityUser<Guid>>()
                .WithMany()
                .HasForeignKey("UserId")
                .OnDelete(DeleteBehavior.Cascade);
            entity.ToTable("AspNetUserTokens", "identity");
        });
    }
}
`;
}

export function renderIdentityMigrationCompositionFile(plan) {
  const providerMethod =
    plan.relationalProvider === "sqlserver" ? "UseSqlServer" : "UseNpgsql";
  return `using ${plan.applicationName}.Api.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ${plan.applicationName}.Api.Infrastructure.Identity;

public static class IdentityMigrationComposition
{
    public static void AddMigrationServices(
        IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        var connectionString = configuration.GetConnectionString("MigrationDatabase");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string 'MigrationDatabase' is required.");
        }

        services.AddDbContext<IdentityDbContext>(options =>
            options.${providerMethod}(
                connectionString,
                providerOptions => providerOptions.MigrationsHistoryTable(
                    "__ef_migrations_history",
                    "identity")));
    }

    public static async Task<string> ExecuteMigrationAsync(
        IServiceProvider services,
        string operation,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentException.ThrowIfNullOrWhiteSpace(operation);
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider
            .GetRequiredService<IdentityDbContext>();
        return operation.ToLowerInvariant() switch
        {
            "validate" => await ValidateAsync(dbContext, cancellationToken),
            "script" => dbContext.Database.GenerateScript(
                options: MigrationsSqlGenerationOptions.Idempotent),
            "apply" => await ApplyAndValidateAsync(dbContext, cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(operation)),
        };
    }

    public static string MigrationIdentity => "Identity";

    private static async Task<string> ValidateAsync(
        IdentityDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException(
                "Identity database connectivity validation failed.");
        }

        var availableMigrations = dbContext.Database.GetMigrations().ToArray();
        var appliedMigrations = (await dbContext.Database
                .GetAppliedMigrationsAsync(cancellationToken))
            .ToArray();
        var pendingMigrations = (await dbContext.Database
                .GetPendingMigrationsAsync(cancellationToken))
            .ToArray();
        var unexpectedMigrations = appliedMigrations
            .Except(availableMigrations)
            .ToArray();
        if (unexpectedMigrations.Length > 0)
        {
            throw new InvalidOperationException(
                $"Identity has unexpected migrations: {string.Join(", ", unexpectedMigrations)}");
        }

        if (pendingMigrations.Length > 0 || dbContext.Database.HasPendingModelChanges())
        {
            throw new InvalidOperationException(
                "Identity has pending migrations or model changes.");
        }

        return "validated: Identity";
    }

    private static async Task<string> ApplyAndValidateAsync(
        IdentityDbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.MigrateAsync(cancellationToken);
        await ValidateAsync(dbContext, cancellationToken);
        return "applied: Identity";
    }
}
`;
}
