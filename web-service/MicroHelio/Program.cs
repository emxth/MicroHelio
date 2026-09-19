using MicroHelio.Config;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;
using System;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Bind database settings from appsettings.json
builder.Services.Configure<MicroHelioDatabaseSettings>(
    builder.Configuration.GetSection("MicroHelioDatabase"));

// Register MongoClient as a Singleton
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var options = sp.GetRequiredService<IOptions<MicroHelioDatabaseSettings>>().Value;
    if (string.IsNullOrWhiteSpace(options?.ConnectionString))
    {
        throw new InvalidOperationException("MicroHelioDatabase:ConnectionString is not configured.");
    }

    return new MongoClient(options.ConnectionString);
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add the TransactionService to the DI container
builder.Services.AddScoped<TransactionService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var secretKey = jwtSettings["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured in the environment.");
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseMiddleware<MicroHelio.Middleware.GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

// Test endpoint to verify MongoDB connection
app.MapGet("/api/test-db", async (MongoDB.Driver.IMongoClient client) =>
{
    try
    {
        var db = client.GetDatabase("MicroHelioDb");
        var result = await db.RunCommandAsync((MongoDB.Driver.Command<MongoDB.Bson.BsonDocument>)"{ping:1}");

        return Results.Ok(new
        {
            message = "MongoDB connected successfully!",
            pingResult = result.ToString()
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database connection failed: {ex.Message}");
    }
});

// Temporary test endpoint to generate a valid GridOperator token
app.MapGet("/api/test-token", (IConfiguration config) =>
{
    var jwtSettings = config.GetSection("Jwt");
    var secretKey = jwtSettings["Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured in the environment.");

    var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secretKey));
    var creds = new Microsoft.IdentityModel.Tokens.SigningCredentials(key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "64f1a2b3c4d5e6f7a8b9c099"),
        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "GridOperator")
    };

    var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
        issuer: jwtSettings["Issuer"],
        audience: jwtSettings["Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddHours(1),
        signingCredentials: creds
    );

    return Results.Ok(new
    {
        token = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token)
    });
});

app.Run();
