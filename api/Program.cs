var builder = WebApplication.CreateBuilder(args);

const string WebAppCorsPolicy = "WebAppCorsPolicy";

// Maximum accepted length of the optional `name` query parameter, measured
// after trimming. Recorded in the message-api spec, so changing it is a spec
// change rather than a silent tweak.
const int MaxNameLength = 50;

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(WebAppCorsPolicy, policy =>
    {
        if (!string.IsNullOrWhiteSpace(allowedOrigin))
        {
            policy.WithOrigins(allowedOrigin)
                  .WithMethods("GET");
        }
    });
});

var app = builder.Build();

app.UseCors(WebAppCorsPolicy);

app.MapGet("/", () => "Hello World!");

app.MapGet("/api/message", (string? name) =>
{
    // Omitted, empty, and whitespace-only names all collapse into the original
    // unpersonalized greeting, so the pre-existing contract has one code path.
    if (string.IsNullOrWhiteSpace(name))
    {
        return Results.Ok(new MessageResponse("Hello World", DateTime.UtcNow));
    }

    var trimmedName = name.Trim();

    // Reject over-long input without echoing the supplied value back.
    if (trimmedName.Length > MaxNameLength)
    {
        return Results.BadRequest();
    }

    return Results.Ok(new MessageResponse($"Hello {trimmedName}", DateTime.UtcNow));
});

app.Run();

internal sealed record MessageResponse(string Message, DateTime TimestampUtc);

public partial class Program { }
