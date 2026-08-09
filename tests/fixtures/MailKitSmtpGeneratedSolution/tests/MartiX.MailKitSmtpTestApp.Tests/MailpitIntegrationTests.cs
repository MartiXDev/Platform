using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;

namespace MartiX.MailKitSmtpTestApp.Tests;

public sealed class MailpitIntegrationTests
{
    [Test, Explicit("Requires Docker and the pinned Mailpit integration profile.")]
    public async Task The_pinned_Mailpit_container_exposes_an_SMTP_port()
    {
        await using var mailpit = new MailpitContainer();
        await mailpit.StartAsync(CancellationToken.None);

        await Assert.That(mailpit.SmtpPort).IsGreaterThan(0);
    }

    private sealed class MailpitContainer : IAsyncDisposable
    {
        private const string Image = "axllent/mailpit:1.30.0";
        private readonly IContainer _container = new ContainerBuilder()
            .WithImage(Image)
            .WithPortBinding(1025, true)
            .WithPortBinding(8025, true)
            .WithWaitStrategy(
                Wait.ForUnixContainer().UntilPortIsAvailable(1025))
            .Build();

        public int SmtpPort => _container.GetMappedPublicPort(1025);

        public Task StartAsync(CancellationToken cancellationToken) =>
            _container.StartAsync(cancellationToken);

        public ValueTask DisposeAsync() => _container.DisposeAsync();
    }
}
