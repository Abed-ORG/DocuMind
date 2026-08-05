import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import Chunk from "../models/Chunk.js";
import Summary, {
  SUMMARY_LEVELS,
} from "../models/Summary.js";

const summaryLevelAliases = new Map([
  ["one-liner", "one-liner"],
  ["oneliner", "one-liner"],
  ["oneLiner", "one-liner"],
  ["executive", "executive"],
  ["detailed", "detailed"],
]);

const maxOutputTokensByLevel = {
  "one-liner": 128,
  executive: 800,
  detailed: 1800,
};

const promptByLevel = {
  "one-liner": [
    "Write exactly one sentence, no more than 35 words.",
    "Capture the central point of the document in plain language.",
  ].join(" "),
  executive: [
    "Write an executive summary for a busy decision-maker.",
    "Use 2 to 4 concise paragraphs.",
    "Cover the document's purpose, main findings, important risks, and recommended next steps when present.",
    "Separate each paragraph with a blank line.",
  ].join(" "),
  detailed: [
    "Write a detailed summary with clear section headings on their own lines.",
    "Cover the document's purpose, major themes, important details, risks, dependencies, and conclusions.",
    "Use short paragraphs or bullet lists under each heading.",
    "Use this structure when the document supports it: Document Purpose, Major Themes and Important Details, Risks and Consequences, Dependencies and Critical Factors, Conclusion.",
    "Separate headings and paragraphs with blank lines.",
    "Preserve material nuance without inventing facts.",
  ].join(" "),
};

const retryableNetworkErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const defaultRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 1000,
};

let geminiClient;

function getGeminiClient() {
  if (!env.geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is required to generate summaries."
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
    error?.message ===
      "Gemini summary request timed out." ||
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
        "Gemini summary request timed out."
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
  return String(response?.text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function getResponseFinishReason(response) {
  return String(
    response?.candidates?.[0]?.finishReason ??
      response?.response?.candidates?.[0]?.finishReason ??
      ""
  )
    .trim()
    .toUpperCase();
}

function createSummaryGenerationError({
  message,
  finishReason,
}) {
  const error = new Error(message);

  error.statusCode = 502;
  error.code = "INCOMPLETE_AI_RESPONSE";
  error.retryable = true;
  error.finishReason = finishReason;

  return error;
}

function assertCompleteSummary(response, content) {
  const finishReason = getResponseFinishReason(response);

  if (!content) {
    throw createSummaryGenerationError({
      message:
        "The AI did not return a summary. Please retry.",
      finishReason: finishReason || "EMPTY",
    });
  }

  if (
    [
      "MAX_TOKENS",
      "SAFETY",
      "RECITATION",
      "BLOCKLIST",
      "PROHIBITED_CONTENT",
      "SPII",
      "MALFORMED_FUNCTION_CALL",
      "OTHER",
    ].includes(finishReason)
  ) {
    throw createSummaryGenerationError({
      message:
        finishReason === "MAX_TOKENS"
          ? "The AI summary was cut off before it finished. Please retry."
          : "The AI could not complete the summary. Please retry.",
      finishReason,
    });
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatChunk(chunk) {
  const metadata = [
    `Chunk: ${chunk.chunkIndex}`,
    `Page: ${chunk.pageNumber}`,
  ];

  if (chunk.sectionHeader) {
    metadata.push(
      `Section: ${normalizeText(chunk.sectionHeader)}`
    );
  }

  return [
    `[${chunk.chunkIndex + 1}] ${metadata.join(", ")}`,
    normalizeText(chunk.text),
  ].join("\n");
}

function buildSummaryPrompt({
  document,
  chunks,
  level,
}) {
  const sourceText = chunks.map(formatChunk).join("\n\n");
  const systemInstruction = [
    "You are DocuMind, a source-grounded document summarizer.",
    "Use only the provided document chunks.",
    "Do not invent facts, names, numbers, risks, or conclusions.",
    "If the chunks do not contain enough information for a detail, omit it.",
    "Write clean plain text without markdown emphasis markers.",
  ].join("\n");
  const userPrompt = [
    `Document name: ${document.originalName}`,
    `Summary level: ${level}`,
    "",
    "Instructions:",
    promptByLevel[level],
    "",
    "Document chunks:",
    sourceText,
  ].join("\n");

  return {
    systemInstruction,
    userPrompt,
  };
}

export function normalizeSummaryLevel(level) {
  const rawLevel = String(level ?? "").trim();
  const normalized =
    summaryLevelAliases.get(rawLevel) ??
    summaryLevelAliases.get(rawLevel.toLowerCase());

  return normalized ?? rawLevel;
}

export function isSummaryLevel(level) {
  return SUMMARY_LEVELS.includes(
    normalizeSummaryLevel(level)
  );
}

export function formatSummary(summary) {
  return {
    id: summary._id,
    documentId: summary.documentId,
    workspaceId: summary.workspaceId,
    level: summary.level,
    content: summary.content,
    generatedAt: summary.generatedAt,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export async function listDocumentSummaries({
  documentId,
  workspaceId,
}) {
  const summaries = await Summary.find({
    documentId,
    workspaceId,
  }).sort({
    generatedAt: -1,
  });

  return summaries.map(formatSummary);
}

export async function invalidateDocumentSummaries({
  documentId,
}) {
  return Summary.deleteMany({
    documentId,
  });
}

async function generateSummaryContent({
  document,
  chunks,
  level,
  model,
  timeoutMs,
  retry,
}) {
  const client = getGeminiClient();
  const selectedModel =
    model ?? env.geminiGenerativeModel;
  const prompt = buildSummaryPrompt({
    document,
    chunks,
    level,
  });
  let response;

  try {
    response = await withRetry(
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
              temperature: 0.2,
              maxOutputTokens:
                maxOutputTokensByLevel[level],
            },
          }),
          timeoutMs ?? env.geminiGenerativeTimeoutMs
        ),
      retry
    );
  } catch (error) {
    if (isRetryableGeminiError(error)) {
      throw createSummaryGenerationError({
        message:
          "The AI provider could not complete the summary. Please retry.",
        finishReason:
          error?.status === 429
            ? "RATE_LIMIT"
            : error?.code ?? error?.name ?? "REQUEST_FAILED",
      });
    }

    throw error;
  }

  const content = getResponseText(response);

  assertCompleteSummary(response, content);

  return {
    content,
    model: selectedModel,
  };
}

export async function summarizeDocument({
  document,
  level,
  force = false,
  model,
  timeoutMs,
  retry,
}) {
  const normalizedLevel = normalizeSummaryLevel(level);

  if (!SUMMARY_LEVELS.includes(normalizedLevel)) {
    const error = new Error(
      "Summary level must be one-liner, executive, or detailed."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!force) {
    const cachedSummary = await Summary.findOne({
      documentId: document._id,
      workspaceId: document.workspaceId,
      level: normalizedLevel,
    });

    if (cachedSummary) {
      return {
        cached: true,
        summary: formatSummary(cachedSummary),
        model: null,
      };
    }
  }

  const chunks = await Chunk.find({
    documentId: document._id,
    workspaceId: document.workspaceId,
  }).sort({
    chunkIndex: 1,
  });

  if (chunks.length === 0) {
    const error = new Error(
      "Document has no processed chunks to summarize."
    );

    error.statusCode = 409;
    throw error;
  }

  const {
    content,
    model: selectedModel,
  } = await generateSummaryContent({
    document,
    chunks,
    level: normalizedLevel,
    model,
    timeoutMs,
    retry,
  });

  const generatedAt = new Date();
  const summary =
    await Summary.findOneAndUpdate(
      {
        documentId: document._id,
        level: normalizedLevel,
      },
      {
        documentId: document._id,
        workspaceId: document.workspaceId,
        level: normalizedLevel,
        content,
        generatedAt,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

  return {
    cached: false,
    summary: formatSummary(summary),
    model: selectedModel,
  };
}
