using MartiX.Platform.Results;

public static class InvalidErrorCodes
{
    public static Error InvalidShape => Error.Create(
        "Orders.invalid",
        ErrorKind.Validation,
        "The order code is invalid.");

    public static Error ReservedPrefix => Error.Create(
        "platform.internal",
        ErrorKind.Unexpected,
        "The platform operation failed.");
}
