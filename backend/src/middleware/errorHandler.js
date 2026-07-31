import { env } from "../config/env.js";

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An unexpected server error occurred."
        : error.message,
    ...(error.code && {
      code: error.code,
    }),
    ...(error.retryable !== undefined && {
      retryable: error.retryable,
    }),
    ...(error.finishReason && {
      finishReason: error.finishReason,
    }),
    ...(env.nodeEnv === "development" && {
      stack: error.stack,
    }),
  });
}
