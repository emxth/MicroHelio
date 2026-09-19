using System;
using System.Text;
using MicroHelio.Config;
using MongoDB.Driver;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

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
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var secretKey = jwtSettings["Key"] ?? "SuperSecretKeyThatIsAtLeast32BytesLongForHMACSHA256";
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

app.Run();
