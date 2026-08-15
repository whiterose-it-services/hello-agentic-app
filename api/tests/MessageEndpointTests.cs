using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Api.Tests;

public class MessageEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public MessageEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    // AC-1 / FR-1, FR-2: GET /api/message returns HTTP 200.
    [Fact]
    public async Task GetMessage_ReturnsHttp200()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // AC-1 / FR-2: response body deserializes to { "message": "Hello World" }.
    [Fact]
    public async Task GetMessage_ReturnsExpectedBody()
    {
        var client = _factory.CreateClient();

        var body = await client.GetFromJsonAsync<MessageResponseDto>("/api/message");

        Assert.NotNull(body);
        Assert.Equal("Hello World", body!.Message);
    }

    // AC-1 / FR-2: response Content-Type is application/json.
    [Fact]
    public async Task GetMessage_ReturnsJsonContentType()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message");

        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/json", response.Content.Headers.ContentType!.MediaType);
    }

    // Response includes a UTC-formatted timestamp: the timestampUtc field is
    // present, parses as an ISO 8601 UTC value ending in "Z", and is within a
    // few seconds of when the request was made.
    [Fact]
    public async Task GetMessage_IncludesUtcTimestampCloseToNow()
    {
        var client = _factory.CreateClient();
        var beforeRequest = DateTime.UtcNow;

        var rawJson = await client.GetStringAsync("/api/message");

        var afterRequest = DateTime.UtcNow;

        using var document = JsonDocument.Parse(rawJson);
        Assert.True(document.RootElement.TryGetProperty("timestampUtc", out var timestampElement));

        var rawValue = timestampElement.GetString();
        Assert.NotNull(rawValue);
        Assert.EndsWith("Z", rawValue);

        var timestamp = timestampElement.GetDateTime();
        Assert.Equal(DateTimeKind.Utc, timestamp.Kind);

        Assert.InRange(timestamp, beforeRequest.AddSeconds(-10), afterRequest.AddSeconds(10));
    }

    // AC-2 / FR-3: a request with an Origin header matching the configured
    // allowed origin receives a matching Access-Control-Allow-Origin header.
    [Fact]
    public async Task GetMessage_WithAllowedOrigin_ReturnsAccessControlAllowOriginHeader()
    {
        const string allowedOrigin = "http://localhost:5173";
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/message");
        request.Headers.Add("Origin", allowedOrigin);

        var response = await client.SendAsync(request);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal(allowedOrigin, Assert.Single(values!));
    }

    private sealed record MessageResponseDto(string Message);
}
