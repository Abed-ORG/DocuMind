import { env } from "../config/env.js";

function getStatusCode(error) {
  const statusCode =
    error.statusCode ?? error.status ?? 500;

  return Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
    ? statusCode
    : 500;
}

function getProviderErrorMessage(error) {
  const message = String(error?.message ?? "");

  try {
    const parsedMessage = JSON.parse(message);
    const providerMessage =
      parsedMessage?.error?.message;

    if (providerMessage) {
      return providerMessage;
    }
  } catch {
    return message;
  }

  return message;
}

function getErrorMessage(error, statusCode) {
  if (statusCode === 429) {
    return (
      getProviderErrorMessage(error) ||
      "The AI provider rate or billing limit was reached."
    );
  }

  return statusCode === 500
    ? "An unexpected server error occurred."
    : error.message;
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = getStatusCode(error);

  res.status(statusCode).json({
    success: false,
    message: getErrorMessage(error, statusCode),
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
