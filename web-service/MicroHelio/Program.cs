using System;
using MicroHelio.Config;
using MongoDB.Driver;
using Microsoft.Extensions.Options;

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
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
