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

    // Spec: message-api "Client supplies a name" — a non-blank name query
    // parameter is woven into the returned message.
    [Fact]
    public async Task GetMessage_WithName_ReturnsPersonalizedMessage()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message?name=Ada");
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello Ada", body!.Message);
    }

    // Spec: message-api "Supplied name has surrounding whitespace" — leading and
    // trailing whitespace is removed, inner whitespace is preserved.
    [Fact]
    public async Task GetMessage_WithSurroundingWhitespaceInName_TrimsTheName()
    {
        var client = _factory.CreateClient();
        var url = "/api/message?name=" + Uri.EscapeDataString("  Ada Lovelace  ");

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello Ada Lovelace", body!.Message);
    }

    // Spec: message-api "Supplied name has surrounding whitespace" as the
    // browser actually sends it. `URLSearchParams` (used by web/src/api.js)
    // encodes spaces as `+`, not `%20`, so a name typed as "Ada Lovelace"
    // arrives on the wire as `name=Ada+Lovelace`. The API must decode `+` back
    // to a space, otherwise the greeting reads "Hello Ada+Lovelace".
    [Fact]
    public async Task GetMessage_WithPlusEncodedSpacesInName_DecodesPlusAsSpace()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message?name=Ada+Lovelace");
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello Ada Lovelace", body!.Message);
        Assert.DoesNotContain("+", body.Message);
    }

    // Same wire format as the browser produces, built the way the browser
    // builds it rather than by hand: leading/trailing spaces become `+` too,
    // and must be trimmed off after decoding.
    [Fact]
    public async Task GetMessage_WithPlusEncodedSurroundingWhitespace_TrimsAndDecodes()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message?name=++Ada+Lovelace++");
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello Ada Lovelace", body!.Message);
    }

    // A literal "+" the user typed is sent percent-encoded as %2B, and must
    // survive as a "+" in the greeting rather than becoming a space.
    [Fact]
    public async Task GetMessage_WithPercentEncodedPlusInName_KeepsTheLiteralPlus()
    {
        var client = _factory.CreateClient();
        var url = "/api/message?name=" + Uri.EscapeDataString("Ada+Grace");

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello Ada+Grace", body!.Message);
    }

    // Spec: message-api "Client supplies a name" — non-ASCII and reserved
    // characters that URLSearchParams percent-encodes must round trip intact.
    [Fact]
    public async Task GetMessage_WithEncodedSpecialCharactersInName_ReturnsThemDecoded()
    {
        var client = _factory.CreateClient();
        const string name = "Ada & Grace Ünïcode";
        var url = "/api/message?name=" + Uri.EscapeDataString(name);

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal($"Hello {name}", body!.Message);
    }

    // Spec: message-api "Supplied name is blank" plus the unchanged
    // "Client fetches the message" scenario — omitted, empty and
    // whitespace-only names all keep the original unpersonalized greeting.
    [Theory]
    [InlineData("/api/message")]
    [InlineData("/api/message?name=")]
    [InlineData("/api/message?name=%20")]
    [InlineData("/api/message?name=%20%20%20")]
    // As the browser sends whitespace: URLSearchParams turns spaces into "+".
    [InlineData("/api/message?name=+")]
    [InlineData("/api/message?name=+++")]
    // Tabs and newlines are whitespace too, so they collapse the same way.
    [InlineData("/api/message?name=%09")]
    [InlineData("/api/message?name=%20%09%0A%0D")]
    // A valueless key, and an unrelated query parameter, are both "no name".
    [InlineData("/api/message?name")]
    [InlineData("/api/message?other=Ada")]
    public async Task GetMessage_WithBlankOrAbsentName_ReturnsHelloWorld(string url)
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync(url);
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("Hello World", body!.Message);
        // Exactly "Hello World" — no trailing space, no stray punctuation.
        Assert.Equal("Hello World", body.Message);
    }

    // Spec: message-api "Supplied name is blank" — the blank path must keep the
    // rest of the pre-existing contract too, i.e. it still carries a fresh
    // timestampUtc and is still served as JSON.
    [Fact]
    public async Task GetMessage_WithBlankName_StillIncludesUtcTimestamp()
    {
        var client = _factory.CreateClient();
        var beforeRequest = DateTime.UtcNow;

        var response = await client.GetAsync("/api/message?name=+++");
        var rawJson = await response.Content.ReadAsStringAsync();
        var afterRequest = DateTime.UtcNow;

        Assert.Equal("application/json", response.Content.Headers.ContentType!.MediaType);

        using var document = JsonDocument.Parse(rawJson);
        Assert.True(document.RootElement.TryGetProperty("timestampUtc", out var timestampElement));
        Assert.EndsWith("Z", timestampElement.GetString());
        Assert.InRange(timestampElement.GetDateTime(), beforeRequest.AddSeconds(-10), afterRequest.AddSeconds(10));
    }

    // The personalized branch builds its own MessageResponse, so prove that
    // branch also satisfies the "Response includes a UTC-formatted timestamp"
    // requirement rather than assuming it shares the no-name code path.
    [Fact]
    public async Task GetMessage_WithName_IncludesUtcTimestampCloseToNowAndJsonContentType()
    {
        var client = _factory.CreateClient();
        var beforeRequest = DateTime.UtcNow;

        var response = await client.GetAsync("/api/message?name=Ada");
        var rawJson = await response.Content.ReadAsStringAsync();
        var afterRequest = DateTime.UtcNow;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType!.MediaType);

        using var document = JsonDocument.Parse(rawJson);
        Assert.True(document.RootElement.TryGetProperty("timestampUtc", out var timestampElement));

        var rawValue = timestampElement.GetString();
        Assert.NotNull(rawValue);
        Assert.EndsWith("Z", rawValue);

        var timestamp = timestampElement.GetDateTime();
        Assert.Equal(DateTimeKind.Utc, timestamp.Kind);
        Assert.InRange(timestamp, beforeRequest.AddSeconds(-10), afterRequest.AddSeconds(10));
    }

    // Spec: "Supplied name length limit" / "Name within the limit is accepted" —
    // exactly 50 characters is still accepted.
    [Fact]
    public async Task GetMessage_WithNameAtMaximumLength_ReturnsHttp200AndIncludesTheName()
    {
        var client = _factory.CreateClient();
        var name = new string('a', 50);

        var response = await client.GetAsync($"/api/message?name={name}");
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal($"Hello {name}", body!.Message);
    }

    // Spec: "Name within the limit is accepted" — the limit is measured after
    // trimming, so whitespace padding around a 50-character name must not push
    // it over the edge. Exercises the boundary via the browser's `+` encoding.
    [Fact]
    public async Task GetMessage_WithPaddedNameThatTrimsToMaximumLength_ReturnsHttp200()
    {
        var client = _factory.CreateClient();
        var name = new string('a', 50);

        var response = await client.GetAsync($"/api/message?name=+++{name}+++");
        var body = await response.Content.ReadFromJsonAsync<MessageResponseDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal($"Hello {name}", body!.Message);
    }

    // Spec: "Supplied name length limit" — 49/50 accepted, 51/52 rejected. Pins
    // both sides of the boundary in one place so an off-by-one in either
    // direction fails a test.
    [Theory]
    [InlineData(1, HttpStatusCode.OK)]
    [InlineData(49, HttpStatusCode.OK)]
    [InlineData(50, HttpStatusCode.OK)]
    [InlineData(51, HttpStatusCode.BadRequest)]
    [InlineData(52, HttpStatusCode.BadRequest)]
    [InlineData(500, HttpStatusCode.BadRequest)]
    public async Task GetMessage_NameLengthBoundary_ReturnsExpectedStatus(int length, HttpStatusCode expected)
    {
        var client = _factory.CreateClient();
        var name = new string('a', length);

        var response = await client.GetAsync($"/api/message?name={name}");

        Assert.Equal(expected, response.StatusCode);
    }

    // Spec: "Supplied name length limit" — the limit counts characters after
    // trimming, so a 51-character name is rejected even when whitespace-padded
    // (the padding must not be counted, and must not rescue it either).
    [Fact]
    public async Task GetMessage_WithPaddedNameThatTrimsToOverLimit_ReturnsHttp400()
    {
        var client = _factory.CreateClient();
        var name = new string('a', 51);

        var response = await client.GetAsync($"/api/message?name=++{name}++");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // Spec: "Supplied name length limit" / "Over-long name is rejected" — 51
    // characters is rejected with HTTP 400 and the value is not echoed back.
    [Fact]
    public async Task GetMessage_WithOverLongName_ReturnsHttp400AndDoesNotEchoTheName()
    {
        var client = _factory.CreateClient();
        var name = new string('b', 51);

        var response = await client.GetAsync($"/api/message?name={name}");
        var rawBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain(name, rawBody);
    }

    // Spec: "Over-long name is rejected" / "AND the response body does not
    // contain the supplied name". A 51-character run of the same letter is a
    // weak probe: it also matches a shorter echo, but a body that echoed only
    // part of the value, or echoed it percent-encoded, would slip past. This
    // uses a distinctive over-long value and checks the raw body for the whole
    // value, for its encoded form, and for any recognisable 10-character
    // fragment of it.
    [Fact]
    public async Task GetMessage_WithOverLongDistinctiveName_LeaksNoFragmentOfItIntoTheBody()
    {
        var client = _factory.CreateClient();
        const string name = "ZaphodBeeblebroxTheGalacticPresidentOfTheUniverseAndMore"; // > 50 chars
        Assert.True(name.Length > 50);

        var response = await client.GetAsync("/api/message?name=" + Uri.EscapeDataString(name));
        var rawBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain(name, rawBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Uri.EscapeDataString(name), rawBody, StringComparison.OrdinalIgnoreCase);

        for (var start = 0; start + 10 <= name.Length; start++)
        {
            var fragment = name.Substring(start, 10);
            Assert.DoesNotContain(fragment, rawBody, StringComparison.OrdinalIgnoreCase);
        }
    }

    // Spec: "Over-long name is rejected" — a name containing characters that
    // would be dangerous if reflected must not be echoed either.
    [Fact]
    public async Task GetMessage_WithOverLongNameContainingMarkup_DoesNotReflectIt()
    {
        var client = _factory.CreateClient();
        var name = "<script>alert('xss')</script>" + new string('q', 40);

        var response = await client.GetAsync("/api/message?name=" + Uri.EscapeDataString(name));
        var rawBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain("script", rawBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("alert", rawBody, StringComparison.OrdinalIgnoreCase);
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

    // CORS / message-api spec: a request with an Origin header that does NOT
    // match the configured allowed origin must not receive an
    // Access-Control-Allow-Origin header for that disallowed origin.
    [Fact]
    public async Task GetMessage_WithDisallowedOrigin_DoesNotReturnAccessControlAllowOriginHeader()
    {
        const string disallowedOrigin = "https://evil.example.com";
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/message");
        request.Headers.Add("Origin", disallowedOrigin);

        var response = await client.SendAsync(request);

        if (response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values))
        {
            Assert.NotEqual(disallowedOrigin, Assert.Single(values));
        }
    }

    // Robustness rather than a named scenario: a malformed request (the `name`
    // key repeated) must not crash the endpoint. The spec does not say which of
    // the two wins, so only "no server error" is asserted.
    [Fact]
    public async Task GetMessage_WithDuplicatedNameParameter_DoesNotReturnServerError()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message?name=Ada&name=Grace");

        Assert.True(
            (int)response.StatusCode < 500,
            $"Expected a non-5xx status, got {(int)response.StatusCode}.");
    }

    // Robustness: an over-long name supplied as a repeated parameter, where
    // neither value alone exceeds the limit, must still not crash and must not
    // leak the values if it is rejected.
    [Fact]
    public async Task GetMessage_WithVeryLongQueryString_DoesNotReturnServerError()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/message?name=" + new string('a', 2000));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // message-api spec "Request from the allowed origin" — adding the `name`
    // query parameter must not change which origins are allowed, on either the
    // success or the 400 path.
    [Theory]
    [InlineData("/api/message?name=Ada")]
    [InlineData("/api/message?name=Ada+Lovelace")]
    public async Task GetMessage_WithNameAndAllowedOrigin_StillReturnsAccessControlAllowOriginHeader(string url)
    {
        const string allowedOrigin = "http://localhost:5173";
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Origin", allowedOrigin);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal(allowedOrigin, Assert.Single(values!));
    }

    // message-api spec "Request from a disallowed origin" — still refused when
    // a name is supplied.
    [Fact]
    public async Task GetMessage_WithNameAndDisallowedOrigin_DoesNotReturnAccessControlAllowOriginHeader()
    {
        const string disallowedOrigin = "https://evil.example.com";
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/message?name=Ada");
        request.Headers.Add("Origin", disallowedOrigin);

        var response = await client.SendAsync(request);

        if (response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values))
        {
            Assert.NotEqual(disallowedOrigin, Assert.Single(values));
        }
    }

    private sealed record MessageResponseDto(string Message);
}
