using System.Net;
using System.Net.Http.Json;
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
