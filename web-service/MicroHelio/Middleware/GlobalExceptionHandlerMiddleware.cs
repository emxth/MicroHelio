/* 
 * Author: Emith Arachchi
 * Purpose: Intercepts unhandled exceptions globally to return standardized JSON error responses.
 */
using System.Net;
using System.Text.Json;

namespace MicroHelio.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        // Injects the next middleware in the pipeline and the system logger
        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        // Invokes the middleware to wrap the HTTP request execution in a try-catch block
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Proceed to the next middleware
                await _next(context);
            }
            catch (Exception ex)
            {
                // Catch any exception that escapes the controllers
                _logger.LogError(ex, "An unhandled exception occurred during the request.");
                await HandleExceptionAsync(context, ex);
            }
        }

        // Formats and writes the standardized JSON error response to the client
        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var errorResponse = new
            {
                error = "Internal Server Error",
                message = "An unexpected error occurred while processing your request.",
                details = exception.Message
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
        }
    }
}
