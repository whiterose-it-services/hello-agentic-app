var builder = WebApplication.CreateBuilder(args);

const string WebAppCorsPolicy = "WebAppCorsPolicy";

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

app.MapGet("/api/message", () => Results.Ok(new MessageResponse("Hello World", DateTime.UtcNow)));

app.Run();

internal sealed record MessageResponse(string Message, DateTime TimestampUtc);

public partial class Program { }
