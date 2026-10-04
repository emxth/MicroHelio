using MicroHelio.Config;
using MicroHelio.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;
using System;
using System.Text;

// Load environment variables from .env file (if present)
DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration["MicroHelioDatabase:ConnectionString"]
    ?? Environment.GetEnvironmentVariable("MICROHELIO_MONGODB_CONNECTIONSTRING")
    ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING");

// Bind database settings from configuration and inject connection string
builder.Services.Configure<MicroHelioDatabaseSettings>(options =>
{
    builder.Configuration.GetSection("MicroHelioDatabase").Bind(options);
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.ConnectionString = connectionString;
    }
});

// Register MongoClient as a Singleton
builder.Services.AddSingleton<IMongoClient>(_ =>
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("MicroHelioDatabase:ConnectionString is not configured. Set MicroHelioDatabase__ConnectionString or MICROHELIO_MONGODB_CONNECTIONSTRING in .env or environment variables.");
    }

    return new MongoClient(connectionString);
});

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.AllowAnyOrigin() // Temp
              .AllowAnyHeader()
              .AllowAnyMethod(); // Temp
    });
});

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

// Component 4 (Transactions)
builder.Services.AddScoped<TransactionService>();

// Component 3 (Reservations)
builder.Services.AddScoped<ReservationService>();
builder.Services.AddScoped<INodeService, NodeService>();
builder.Services.AddScoped<ISlotService, SlotService>();

// Component 1 (Auth & Users)
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ProsumerService>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<AuthService>();

// Authentication Middleware 
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection("Jwt");
        var secretKey = jwtSettings["Key"] 
            ?? Environment.GetEnvironmentVariable("JWT_SECRET") 
            ?? throw new InvalidOperationException("Jwt:Key is not configured. Set Jwt__Key or JWT_SECRET in .env or environment variables.");
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"] ?? "MicroHelioIssuer",
            ValidAudience = jwtSettings["Audience"] ?? "MicroHelioAudience",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Run database seeder for initial Backoffice user
    using var scope = app.Services.CreateScope();
    await MicroHelio.Data.DatabaseSeeder.SeedBackofficeAsync(scope.ServiceProvider);
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowReactApp");

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

app.Run();