import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import { buildRagPrompt } from "./ragPromptService.js";
import { searchWorkspaceChunks } from "./vectorSearchService.js";

const defaultRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 1000,
};

const retryableNetworkErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

let geminiClient;

function getGeminiClient() {
  if (!env.geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is required to generate answers."
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: env.geminiApiKey,
    });
  }

  return geminiClient;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableGeminiError(error) {
  const status =
    error?.status ??
    error?.statusCode ??
    error?.response?.status;
  const code = error?.code ?? error?.cause?.code;

  return (
    retryableNetworkErrorCodes.has(code) ||
    error?.name === "TimeoutError" ||
    error?.message === "Gemini answer request timed out." ||
    error?.message === "fetch failed" ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(
        "Gemini answer request timed out."
      );

      error.code = "ETIMEDOUT";
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withRetry(operation, options = {}) {
  const {
    maxRetries,
    baseDelayMs,
  } = {
    ...defaultRetryOptions,
    ...options,
  };

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt >= maxRetries ||
        !isRetryableGeminiError(error)
      ) {
        throw error;
      }

      await sleep(baseDelayMs * 2 ** attempt);
      attempt += 1;
    }
  }
}

function getResponseText(response) {
  return String(response?.text ?? "").trim();
}

export function extractCitationReferences(
  answerText,
  sources = []
) {
  const matches = String(answerText ?? "").matchAll(
    /\[(\d+)\]/g
  );
  const citations = [];
  const seenCitationNumbers = new Set();

  for (const match of matches) {
    const citationNumber = Number(match[1]);
    const source = sources[citationNumber - 1];

    if (
      !Number.isInteger(citationNumber) ||
      !source ||
      seenCitationNumbers.has(citationNumber)
    ) {
      continue;
    }

    seenCitationNumbers.add(citationNumber);
    citations.push({
      label: String(citationNumber),
      citationNumber,
      chunkId: source.chunkId,
      documentId: source.documentId,
      documentName: source.documentName,
      pageNumber: source.pageNumber,
      chunkIndex: source.chunkIndex,
      sectionHeader: source.sectionHeader,
      score: source.score,
      text: source.text,
    });
  }

  return citations;
}

export async function generateRagAnswer({
  question,
  sourceChunks = [],
  conversationHistory = [],
  model,
  timeoutMs,
  retry,
  temperature = 0.2,
  maxOutputTokens = 1200,
} = {}) {
  const prompt = buildRagPrompt({
    question,
    sourceChunks,
    conversationHistory,
  });
  const client = getGeminiClient();
  const selectedModel =
    model ?? env.geminiGenerativeModel;
  const response = await withRetry(
    () =>
      withTimeout(
        client.models.generateContent({
          model: selectedModel,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt.userPrompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction:
              prompt.systemInstruction,
            temperature,
            maxOutputTokens,
          },
        }),
        timeoutMs ?? env.geminiGenerativeTimeoutMs
      ),
    retry
  );
  const answer = getResponseText(response);

  if (!answer) {
    throw new Error(
      "Gemini returned an empty answer."
    );
  }

  return {
    answer,
    citations: extractCitationReferences(
      answer,
      prompt.sources
    ),
    sources: prompt.sources,
    model: selectedModel,
  };
}

export async function answerWorkspaceQuestion({
  workspaceId,
  question,
  limit,
  conversationHistory,
} = {}) {
  const sourceChunks = await searchWorkspaceChunks({
    workspaceId,
    query: question,
    limit,
  });

  return generateRagAnswer({
    question,
    sourceChunks,
    conversationHistory,
  });
}
