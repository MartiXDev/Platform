using System;

namespace MartiX.Platform.Results;

internal static class ErrorCodeContract
{
    private const string ReservedPlatformPrefix = "platform.";

    internal static bool IsReservedPlatformCode(string code)
    {
        return code.StartsWith(ReservedPlatformPrefix, StringComparison.Ordinal);
    }

    internal static bool IsValidErrorCode(string code)
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

            if (!TryAppendCodeCharacter(
                    character,
                    ref segmentLength,
                    ref previousWasHyphen))
            {
                return false;
            }
        }

        return IsValidSegmentEnd(segmentLength, previousWasHyphen)
            && segmentCount >= 2;
    }

    private static bool IsValidSegmentEnd(int segmentLength, bool previousWasHyphen)
    {
        return segmentLength > 0 && !previousWasHyphen;
    }

    private static bool TryAppendCodeCharacter(
        char character,
        ref int segmentLength,
        ref bool previousWasHyphen)
    {
        if (character == '-')
        {
            if (segmentLength == 0 || previousWasHyphen)
            {
                return false;
            }

            segmentLength++;
            previousWasHyphen = true;
            return true;
        }

        if (!IsLowercaseAsciiLetterOrDigit(character))
        {
            return false;
        }

        segmentLength++;
        previousWasHyphen = false;
        return true;
    }

    private static bool IsLowercaseAsciiLetterOrDigit(char character)
    {
        return character is >= 'a' and <= 'z'
            or >= '0' and <= '9';
    }
}
