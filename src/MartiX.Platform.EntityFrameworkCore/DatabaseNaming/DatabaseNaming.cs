using System;
using System.Text;

namespace MartiX.Platform.EntityFrameworkCore.DatabaseNaming;

/// <summary>Provides deterministic, provider-independent database identifiers.</summary>
public static class DatabaseNaming
{
    /// <summary>Converts a .NET identifier into lowercase <c>snake_case</c>.</summary>
    /// <param name="identifier">The identifier to convert.</param>
    /// <returns>The normalized database identifier.</returns>
    public static string ToSnakeCase(string identifier)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(identifier);

        var builder = new StringBuilder(identifier.Length + 8);
        for (var index = 0; index < identifier.Length; index++)
        {
            var character = identifier[index];
            if (character == '_')
            {
                builder.Append(character);
                continue;
            }

            if (!char.IsLetterOrDigit(character))
            {
                throw new ArgumentException(
                    "Database identifiers may contain only letters, digits, and underscores.",
                    nameof(identifier));
            }

            var previous = index > 0 ? identifier[index - 1] : '\0';
            var next = index + 1 < identifier.Length ? identifier[index + 1] : '\0';
            var startsWord =
                char.IsUpper(character) &&
                index > 0 &&
                (char.IsLower(previous) ||
                    char.IsDigit(previous) ||
                    (char.IsUpper(previous) && char.IsLower(next)));
            if (startsWord && builder.Length > 0 && builder[^1] != '_')
            {
                builder.Append('_');
            }

            builder.Append(char.ToLowerInvariant(character));
        }

        return builder.ToString();
    }
}
