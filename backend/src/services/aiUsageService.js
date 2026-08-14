import AIUsage from "../models/AIUsage.js";
import { env } from "../config/env.js";

function toNonNegativeTokenCount(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? Math.round(number)
    : 0;
}

function toNonNegativeCost(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : 0;
}

function getResponseUsageMetadata(response) {
  return (
    response?.usageMetadata ??
    response?.response?.usageMetadata ??
    {}
  );
}

export function buildAiUsageFromResponse({
  response,
  model,
} = {}) {
  const usageMetadata =
    getResponseUsageMetadata(response);
  const inputTokenCount = toNonNegativeTokenCount(
    usageMetadata.promptTokenCount
  );
  const outputTokenCount = toNonNegativeTokenCount(
    usageMetadata.candidatesTokenCount ??
      usageMetadata.candidateTokenCount ??
      usageMetadata.outputTokenCount
  );
  const totalTokenCount = toNonNegativeTokenCount(
    usageMetadata.totalTokenCount ||
      inputTokenCount + outputTokenCount
  );
  const cachedTokenCount = toNonNegativeTokenCount(
    usageMetadata.cachedContentTokenCount
  );
  const thoughtsTokenCount = toNonNegativeTokenCount(
    usageMetadata.thoughtsTokenCount
  );
  const estimatedCostUsd =
    (inputTokenCount / 1_000_000) *
      env.aiInputCostPerMillionTokens +
    (outputTokenCount / 1_000_000) *
      env.aiOutputCostPerMillionTokens;

  return {
    model: String(model ?? "").trim(),
    inputTokenCount,
    outputTokenCount,
    totalTokenCount,
    cachedTokenCount,
    thoughtsTokenCount,
    estimatedCostUsd: toNonNegativeCost(
      estimatedCostUsd
    ),
  };
}

export async function recordWorkspaceAiUsage({
  workspaceId,
  feature,
  usage,
} = {}) {
  if (!workspaceId || !feature || !usage) {
    return null;
  }

  if ((usage.totalTokenCount ?? 0) <= 0) {
    return null;
  }

  try {
    return await AIUsage.create({
      workspaceId,
      feature,
      model: usage.model,
      inputTokenCount: usage.inputTokenCount,
      outputTokenCount: usage.outputTokenCount,
      totalTokenCount: usage.totalTokenCount,
      cachedTokenCount: usage.cachedTokenCount,
      thoughtsTokenCount: usage.thoughtsTokenCount,
      estimatedCostUsd: usage.estimatedCostUsd,
    });
  } catch (error) {
    console.warn(
      "Unable to record AI usage analytics.",
      error
    );

    return null;
  }
}
