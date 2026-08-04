# AspNetCoreFailureAdapterGeneratedSolution

This temporary, explicitly named Generated Solution is the primary acceptance
seam for issue #10. It references the packed `MartiX.Platform.AspNetCore`
package from an isolated local feed, runs a real ASP.NET Core host through
`TestServer`, and verifies typed success, every Kernel error category,
unexpected-exception redaction, and OpenAPI Problem Details metadata.

The consumer is test-owned conformance behavior and is not distributed as
Platform product code.
