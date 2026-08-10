import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import {
  buildRagPrompt,
  buildStructuredExtractionPrompt,
} from "./ragPromptService.js";
import { searchWorkspaceChunks } from "./vectorSearchService.js";

const followUpPattern =
  /\b(it|that|this|they|them|those|same|above|previous|earlier|paragraph|rewrite|reformat|summarize|summary)\b/i;
const explicitFilePattern =
  /\b[\w .()[\]-]+\.(pdf|docx|txt|csv)\b/i;
const structuredExtractionMaxChunkCharacters = 1200;

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

function stripJsonCodeFence(text) {
  return String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonObject(text) {
  const normalizedText = stripJsonCodeFence(text);

  try {
    return JSON.parse(normalizedText);
  } catch {
    const firstBrace = normalizedText.indexOf("{");
    const lastBrace = normalizedText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("The AI did not return valid JSON.");
    }

    return JSON.parse(
      normalizedText.slice(firstBrace, lastBrace + 1)
    );
  }
}

function normalizeExtractionValue(value, maxLength = 1000) {
  const normalizedValue = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedValue.length > maxLength
    ? `${normalizedValue.slice(0, maxLength).trim()}...`
    : normalizedValue;
}

function normalizeExtractionRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (Array.isArray(row)) {
        return {
          field: normalizeExtractionValue(row[0], 180),
          value: normalizeExtractionValue(row[1]),
          type: normalizeExtractionValue(row[2], 120),
          source: normalizeExtractionValue(row[3], 260),
          documentName: "",
          pageNumber: null,
          chunkIndex: null,
          evidence: "",
        };
      }

      return {
        field: normalizeExtractionValue(
          row?.field ?? row?.f,
          180
        ),
        value: normalizeExtractionValue(
          row?.value ?? row?.v
        ),
        type: normalizeExtractionValue(
          row?.type ?? row?.t,
          120
        ),
        source: normalizeExtractionValue(
          row?.source ?? row?.s,
          260
        ),
        documentName: normalizeExtractionValue(
          row?.documentName,
          255
        ),
        pageNumber:
          Number.isInteger(Number(row?.pageNumber)) &&
          Number(row.pageNumber) > 0
            ? Number(row.pageNumber)
            : null,
        chunkIndex:
          Number.isInteger(Number(row?.chunkIndex)) &&
          Number(row.chunkIndex) >= 0
            ? Number(row.chunkIndex)
            : null,
        evidence: normalizeExtractionValue(
          row?.evidence,
          1200
        ),
      };
    })
    .filter(
      (row) =>
        row.field ||
        row.value ||
        row.type ||
        row.source
    );
}

function normalizeExtractionTable(parsedJson) {
  const rows = Array.isArray(parsedJson)
    ? parsedJson
    : parsedJson?.rows;

  return {
    columns: [
      "field",
      "value",
      "type",
      "source",
    ],
    rows: normalizeExtractionRows(rows),
  };
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

function createIncompleteAnswerError({
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

function assertCompleteAnswer(response, answer) {
  const finishReason = getResponseFinishReason(response);

  if (!answer) {
    throw createIncompleteAnswerError({
      message:
        "The AI did not return an answer. Please retry.",
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
    throw createIncompleteAnswerError({
      message:
        finishReason === "MAX_TOKENS"
          ? "The AI response was cut off before it finished. Please retry."
          : "The AI could not complete the response. Please retry.",
      finishReason,
    });
  }
}

function getContent(value) {
  return String(value?.content ?? value?.text ?? "").trim();
}

function getRecentFocusedDocumentIds(
  conversationHistory = []
) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  for (
    let index = conversationHistory.length - 1;
    index >= 0;
    index -= 1
  ) {
    const message = conversationHistory[index];
    const citations = Array.isArray(message?.citations)
      ? message.citations
      : [];
    const documentIds = [
      ...new Set(
        citations
          .map((citation) =>
            String(citation?.documentId ?? "").trim()
          )
          .filter(Boolean)
      ),
    ];

    if (documentIds.length > 0) {
      return documentIds;
    }
  }

  return [];
}

function shouldUseRecentDocumentFocus({
  question,
  conversationHistory,
}) {
  const normalizedQuestion = String(question ?? "");

  if (explicitFilePattern.test(normalizedQuestion)) {
    return false;
  }

  if (followUpPattern.test(normalizedQuestion)) {
    return true;
  }

  const lastUserMessage = [...(conversationHistory ?? [])]
    .reverse()
    .find((message) => message?.role === "user");

  return Boolean(
    lastUserMessage &&
      explicitFilePattern.test(getContent(lastUserMessage))
  );
}

function buildRetrievalQuery({
  question,
  conversationHistory,
}) {
  const recentHistory = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-4)
    : [];
  const contextText = recentHistory
    .map(getContent)
    .filter(Boolean)
    .join(" ");

  return [contextText, question]
    .filter(Boolean)
    .join(" ")
    .trim();
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
              temperature,
              maxOutputTokens,
            },
          }),
          timeoutMs ?? env.geminiGenerativeTimeoutMs
        ),
      retry
    );
  } catch (error) {
    if (isRetryableGeminiError(error)) {
      throw createIncompleteAnswerError({
        message:
          "The AI provider could not complete the response. Please retry.",
        finishReason:
          error?.status === 429
            ? "RATE_LIMIT"
            : error?.code ?? error?.name ?? "REQUEST_FAILED",
      });
    }

    throw error;
  }
  const answer = getResponseText(response);

  assertCompleteAnswer(response, answer);

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
  documentIds,
} = {}) {
  const requestedDocumentIds = Array.isArray(documentIds)
    ? documentIds
        .map((documentId) =>
          String(documentId ?? "").trim()
        )
        .filter(Boolean)
    : [];
  let focusedDocumentIds = requestedDocumentIds;

  if (
    focusedDocumentIds.length === 0 &&
    shouldUseRecentDocumentFocus({
      question,
      conversationHistory,
    })
  ) {
    focusedDocumentIds = getRecentFocusedDocumentIds(
      conversationHistory
    );
  }
  const sourceChunks = await searchWorkspaceChunks({
    workspaceId,
    query: buildRetrievalQuery({
      question,
      conversationHistory,
    }),
    limit,
    documentIds: focusedDocumentIds,
  });

  return generateRagAnswer({
    question,
    sourceChunks,
    conversationHistory,
  });
}

export async function generateStructuredExtraction({
  prompt,
  sourceChunks = [],
  model,
  timeoutMs,
  retry,
  temperature = 0.1,
  maxOutputTokens = 6000,
} = {}) {
  const extractionPrompt =
    buildStructuredExtractionPrompt({
      prompt,
      sourceChunks,
      maxChunkCharacters:
        structuredExtractionMaxChunkCharacters,
    });
  const client = getGeminiClient();
  const selectedModel =
    model ?? env.geminiGenerativeModel;
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
                    text: extractionPrompt.userPrompt,
                  },
                ],
              },
            ],
            config: {
              systemInstruction:
                extractionPrompt.systemInstruction,
              temperature,
              maxOutputTokens,
            },
          }),
          timeoutMs ?? env.geminiGenerativeTimeoutMs
        ),
      retry
    );
  } catch (error) {
    throw createIncompleteAnswerError({
      message:
        "The AI provider could not complete the extraction. Please retry.",
      finishReason:
        error?.status === 429
          ? "RATE_LIMIT"
          : error?.status ??
            error?.code ??
            error?.name ??
            "REQUEST_FAILED",
    });
  }

  const answer = getResponseText(response);

  assertCompleteAnswer(response, answer);

  let table;

  try {
    table = normalizeExtractionTable(
      parseJsonObject(answer)
    );
  } catch (error) {
    const incompleteError =
      createIncompleteAnswerError({
        message:
          "The AI returned extraction data that could not be parsed. Please retry.",
        finishReason: "INVALID_JSON",
      });

    incompleteError.cause = error;
    throw incompleteError;
  }

  return {
    ...table,
    rawJson: answer,
    sources: extractionPrompt.sources,
    model: selectedModel,
  };
}

export async function extractWorkspaceFields({
  workspaceId,
  prompt,
  limit = 4,
  documentIds,
} = {}) {
  const sourceChunks = await searchWorkspaceChunks({
    workspaceId,
    query: prompt,
    limit,
    documentIds,
  });

  if (sourceChunks.length === 0) {
    return {
      columns: [
        "field",
        "value",
        "type",
        "source",
      ],
      rows: [],
      rawJson:
        "{\"columns\":[\"field\",\"value\",\"type\",\"source\"],\"rows\":[]}",
      sources: [],
      model: env.geminiGenerativeModel,
    };
  }

  return generateStructuredExtraction({
    prompt,
    sourceChunks,
  });
}
