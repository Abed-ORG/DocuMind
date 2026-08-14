import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import {
  buildAiUsageFromResponse,
} from "./aiUsageService.js";
import {
  buildComparisonPrompt,
  buildRagPrompt,
  buildStructuredExtractionPrompt,
} from "./ragPromptService.js";
import { searchWorkspaceChunks } from "./vectorSearchService.js";

const followUpPattern =
  /\b(it|that|this|they|them|those|same|above|previous|earlier|paragraph|rewrite|reformat|summarize|summary)\b/i;
const explicitFilePattern =
  /\b[\w .()[\]-]+\.(pdf|docx|txt|csv)\b/i;
const ragAnswerMaxChunkCharacters = 1800;
const comparisonMaxChunkCharacters = 2200;
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

function toPositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
}

function toNonNegativeInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number >= 0
    ? number
    : null;
}

function cleanExtractionLabel(value, fallback = "") {
  const normalized = normalizeExtractionValue(
    value,
    180
  )
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function createExtractionKey(label, fallback) {
  const normalized = normalizeExtractionValue(label)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+([a-z0-9])/g, (_, letter) =>
      letter.toUpperCase()
    );

  return normalized || fallback;
}

function addExtractionAlias(aliases, value) {
  const normalized = normalizeExtractionValue(value, 180);

  if (normalized && !aliases.includes(normalized)) {
    aliases.push(normalized);
  }
}

function createLabelKeyAlias(label) {
  return normalizeExtractionValue(label)
    .replace(/\s+/g, "")
    .replace(/^./, (letter) => letter.toLowerCase());
}

function createSnakeCaseAlias(label) {
  return normalizeExtractionValue(label)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createRecordColumnAliases({
  column,
  label,
  key,
  fallback,
}) {
  const aliases = [];
  const seedValues = [
    column?.key,
    column?.label,
    column?.name,
    typeof column === "string" ? column : "",
    label,
    key,
    fallback,
  ];

  seedValues.forEach((value) => {
    addExtractionAlias(aliases, value);
    addExtractionAlias(
      aliases,
      createExtractionKey(value, "")
    );
    addExtractionAlias(aliases, createLabelKeyAlias(value));
    addExtractionAlias(aliases, createSnakeCaseAlias(value));
    addExtractionAlias(
      aliases,
      normalizeExtractionValue(value).toLowerCase()
    );
  });

  return aliases;
}

function isCsvSource(source = {}) {
  return /\.csv$/i.test(
    String(source.documentName ?? source.source ?? "")
  );
}

function normalizeExtractionSource(source, fallback = {}) {
  if (typeof source === "string") {
    return {
      documentName: normalizeExtractionValue(
        fallback.documentName,
        255
      ),
      pageNumber: toPositiveInteger(fallback.pageNumber),
      chunkIndex: toNonNegativeInteger(fallback.chunkIndex),
      sourceLabel: normalizeExtractionValue(source, 260),
    };
  }

  const documentName = normalizeExtractionValue(
    source?.documentName ??
      source?.document ??
      source?.fileName ??
      source?.filename ??
      fallback.documentName,
    255
  );
  const pageNumber = toPositiveInteger(
    source?.pageNumber ??
      source?.page ??
      fallback.pageNumber
  );
  const chunkIndex = toNonNegativeInteger(
    source?.chunkIndex ??
      source?.chunk ??
      fallback.chunkIndex
  );

  return {
    documentName,
    pageNumber: isCsvSource({
      documentName,
    })
      ? null
      : pageNumber,
    chunkIndex,
    sourceLabel: normalizeExtractionValue(
      source?.sourceLabel ?? source?.label,
      260
    ),
  };
}

function formatExtractionSource(source = {}) {
  if (source.sourceLabel) {
    return source.sourceLabel;
  }

  if (!source.documentName) {
    return "";
  }

  if (isCsvSource(source)) {
    return source.documentName;
  }

  if (source.pageNumber) {
    return `${source.documentName}, p. ${source.pageNumber}`;
  }

  if (source.chunkIndex !== null && source.chunkIndex !== undefined) {
    return `${source.documentName}, chunk ${source.chunkIndex}`;
  }

  return source.documentName;
}

function isMoneyLike({ label, type, value }) {
  const text = `${label ?? ""} ${type ?? ""} ${value ?? ""}`.toLowerCase();

  return (
    /\b(money|currency|amount|price|cost|total|value|balance|salary|revenue|usd|eur|gbp)\b/.test(
      text
    ) || /[$€£]\s*\d/.test(String(value ?? ""))
  );
}

function isDateLike({ label, type }) {
  return /\b(date|deadline|due|start|end|effective|expiry|expiration)\b/i.test(
    `${label ?? ""} ${type ?? ""}`
  );
}

function formatMoneyValue(value) {
  const text = normalizeExtractionValue(value, 120);
  const match = text.match(
    /[-+]?\$?\s*([0-9][0-9,]*)(?:\.([0-9]+))?/
  );

  if (!match) {
    return text;
  }

  const number = Number(
    `${match[1].replace(/,/g, "")}.${match[2] ?? "0"}`
  );

  if (!Number.isFinite(number)) {
    return text;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDateValue(value) {
  const text = normalizeExtractionValue(value, 120);
  const isoMatch = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/
  );

  if (!isoMatch) {
    return text;
  }

  const date = new Date(
    Number(isoMatch[1]),
    Number(isoMatch[2]) - 1,
    Number(isoMatch[3])
  );

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatExtractionCell(value, { label, type } = {}) {
  const normalized = normalizeExtractionValue(value);

  if (!normalized) {
    return "";
  }

  if (
    isMoneyLike({
      label,
      type,
      value: normalized,
    })
  ) {
    return formatMoneyValue(normalized);
  }

  if (
    isDateLike({
      label,
      type,
    })
  ) {
    return formatDateValue(normalized);
  }

  return normalized;
}

function normalizeLegacyExtractionRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (Array.isArray(row)) {
        const source = normalizeExtractionSource(row[3]);
        const sourceLabel =
          formatExtractionSource(source) ||
          normalizeExtractionValue(row[3], 260);
        const field = cleanExtractionLabel(row[0]);
        const type = normalizeExtractionValue(row[2], 120);

        return {
          field,
          value: formatExtractionCell(row[1], {
            label: field,
            type,
          }),
          type,
          source: sourceLabel,
          documentName: source.documentName,
          pageNumber: source.pageNumber,
          chunkIndex: source.chunkIndex,
          evidence: "",
        };
      }

      const source = normalizeExtractionSource(
        row?.source ?? row?.s,
        row
      );
      const field = cleanExtractionLabel(
        row?.field ?? row?.f
      );
      const type = normalizeExtractionValue(
        row?.type ?? row?.t,
        120
      );

      return {
        field,
        value: formatExtractionCell(
          row?.value ?? row?.v,
          {
            label: field,
            type,
          }
        ),
        type,
        source: formatExtractionSource(source),
        documentName: source.documentName,
        pageNumber: source.pageNumber,
        chunkIndex: source.chunkIndex,
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

function normalizeExtractionFields(fields) {
  return normalizeLegacyExtractionRows(fields);
}

function normalizeRecordColumns(columns, rows = []) {
  const normalizedColumns = Array.isArray(columns)
    ? columns
        .map((column, index) => {
          const label = cleanExtractionLabel(
            column?.label ?? column?.name ?? column?.key ?? column,
            `Column ${index + 1}`
          );
          const key = createExtractionKey(
            column?.key ?? label,
            `column${index + 1}`
          );

          return {
            key,
            label,
            type: normalizeExtractionValue(column?.type, 120),
            aliases: createRecordColumnAliases({
              column,
              label,
              key,
              fallback: `column${index + 1}`,
            }),
          };
        })
        .filter((column) => column.key && column.label)
    : [];

  if (normalizedColumns.length > 0) {
    return normalizedColumns;
  }

  const firstValues =
    rows.find((row) => row?.values && typeof row.values === "object")
      ?.values ?? {};

  return Object.keys(firstValues).map((key, index) => ({
    key: createExtractionKey(key, `column${index + 1}`),
    label: cleanExtractionLabel(key, `Column ${index + 1}`),
    type: "",
    aliases: createRecordColumnAliases({
      column: key,
      label: cleanExtractionLabel(key, `Column ${index + 1}`),
      key: createExtractionKey(key, `column${index + 1}`),
      fallback: `column${index + 1}`,
    }),
  }));
}

function readRecordValue(rawValues, column, columnIndex) {
  if (Array.isArray(rawValues)) {
    return rawValues[columnIndex];
  }

  if (!rawValues || typeof rawValues !== "object") {
    return undefined;
  }

  const aliases = Array.isArray(column.aliases)
    ? column.aliases
    : [column.key, column.label];

  for (const alias of aliases) {
    if (
      Object.prototype.hasOwnProperty.call(rawValues, alias)
    ) {
      return rawValues[alias];
    }
  }

  const lowerCaseAliases = new Set(
    aliases.map((alias) => String(alias).toLowerCase())
  );
  const matchingKey = Object.keys(rawValues).find((key) =>
    lowerCaseAliases.has(String(key).toLowerCase())
  );

  return matchingKey ? rawValues[matchingKey] : undefined;
}

function normalizeRecordRows(rows, columns) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      const rawValues =
        Array.isArray(row)
          ? row
          : row?.values && typeof row.values === "object"
          ? row.values
          : row;
      const source = normalizeExtractionSource(
        row?.source,
        row
      );
      const values = {};

      columns.forEach((column) => {
        const columnIndex = columns.findIndex(
          (item) => item.key === column.key
        );
        const rawValue = readRecordValue(
          rawValues,
          column,
          columnIndex
        );

        values[column.key] = formatExtractionCell(rawValue, {
          label: column.label,
          type: column.type,
        });
      });

      return {
        values,
        source,
        sourceLabel: formatExtractionSource(source),
        evidence: normalizeExtractionValue(
          row?.evidence,
          1200
        ),
      };
    })
    .filter((row) =>
      columns.some((column) => row.values[column.key])
    );
}

function isRecordSetLike(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (Array.isArray(value.rows) ||
        Array.isArray(value.records) ||
        Array.isArray(value.items) ||
        Array.isArray(value.columns) ||
        value.name ||
        value.title)
  );
}

function coerceRecordSets(recordSets, parsedJson = {}) {
  if (Array.isArray(recordSets)) {
    if (recordSets.length === 0) {
      return [];
    }

    return recordSets.some(isRecordSetLike)
      ? recordSets
      : [
          {
            name: parsedJson.name ?? parsedJson.title,
            columns: parsedJson.columns,
            rows: recordSets,
          },
        ];
  }

  if (isRecordSetLike(recordSets)) {
    return [recordSets];
  }

  return [];
}

function getRecordSetRows(recordSet) {
  if (Array.isArray(recordSet?.rows)) {
    return recordSet.rows;
  }

  if (Array.isArray(recordSet?.records)) {
    return recordSet.records;
  }

  if (Array.isArray(recordSet?.items)) {
    return recordSet.items;
  }

  return [];
}

function normalizeRecordSets(recordSets, parsedJson = {}) {
  const normalizedRecordSets = coerceRecordSets(
    recordSets,
    parsedJson
  );

  return normalizedRecordSets
    .map((recordSet, index) => {
      const rawRows = getRecordSetRows(recordSet);
      const columns = normalizeRecordColumns(
        recordSet?.columns,
        rawRows
      );
      const rows = normalizeRecordRows(
        rawRows,
        columns
      );

      return {
        id: `records-${index + 1}`,
        name: cleanExtractionLabel(
          recordSet?.name ?? recordSet?.title,
          `Records ${index + 1}`
        ),
        columns,
        rows,
      };
    })
    .filter(
      (recordSet) =>
        recordSet.columns.length > 0 &&
        recordSet.rows.length > 0
    );
}

function buildFieldGroup(fields) {
  if (fields.length === 0) {
    return null;
  }

  return {
    id: "fields",
    kind: "fields",
    title: "Single-Value Fields",
    columns: [
      {
        key: "field",
        label: "Field",
      },
      {
        key: "value",
        label: "Value",
      },
      {
        key: "type",
        label: "Type",
      },
      {
        key: "source",
        label: "Source",
      },
    ],
    rows: fields.map((field) => ({
      values: {
        field: field.field,
        value: field.value,
        type: field.type,
        source: field.source,
      },
      source: {
        documentName: field.documentName,
        pageNumber: field.pageNumber,
        chunkIndex: field.chunkIndex,
      },
      evidence: field.evidence,
    })),
  };
}

function buildRecordGroup(recordSet) {
  const sourceColumn = {
    key: "source",
    label: "Source",
  };

  return {
    id: recordSet.id,
    kind: "records",
    title: recordSet.name,
    columns: [
      ...recordSet.columns.map((column) => ({
        key: column.key,
        label: column.label,
        type: column.type,
      })),
      sourceColumn,
    ],
    rows: recordSet.rows.map((row) => ({
      values: {
        ...row.values,
        source: row.sourceLabel,
      },
      source: row.source,
      evidence: row.evidence,
    })),
  };
}

export function normalizeStructuredExtractionResult(parsedJson) {
  const rows = Array.isArray(parsedJson)
    ? parsedJson
    : parsedJson?.rows;
  const legacyFields = normalizeLegacyExtractionRows(rows);
  const fields = normalizeExtractionFields(
    parsedJson?.fields ?? []
  );
  const normalizedFields =
    fields.length > 0 ? fields : legacyFields;
  const recordSets = normalizeRecordSets(
    parsedJson?.recordSets ??
      parsedJson?.records ??
      [],
    parsedJson
  );
  const groups = [
    buildFieldGroup(normalizedFields),
    ...recordSets.map(buildRecordGroup),
  ].filter(Boolean);

  return {
    columns: [
      "field",
      "value",
      "type",
      "source",
    ],
    rows: normalizedFields,
    fields: normalizedFields,
    recordSets,
    groups,
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
  maxOutputTokens = 3000,
} = {}) {
  const prompt = buildRagPrompt({
    question,
    sourceChunks,
    conversationHistory,
    maxChunkCharacters: ragAnswerMaxChunkCharacters,
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
    usage: buildAiUsageFromResponse({
      response,
      model: selectedModel,
    }),
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
    limit:
      typeof limit === "number"
        ? Math.min(limit, 4)
        : 4,
    documentIds: focusedDocumentIds,
  });

  return generateRagAnswer({
    question,
    sourceChunks,
    conversationHistory,
  });
}

export async function generateComparisonAnswer({
  topic,
  firstDocumentName,
  secondDocumentName,
  firstSourceChunks = [],
  secondSourceChunks = [],
  model,
  timeoutMs,
  retry,
  temperature = 0.2,
  maxOutputTokens = 3000,
} = {}) {
  const prompt = buildComparisonPrompt({
    topic,
    firstDocumentName,
    secondDocumentName,
    firstSourceChunks,
    secondSourceChunks,
    maxChunkCharacters: comparisonMaxChunkCharacters,
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
          "The AI provider could not complete the comparison. Please retry.",
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
    usage: buildAiUsageFromResponse({
      response,
      model: selectedModel,
    }),
  };
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
    table = normalizeStructuredExtractionResult(
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
    usage: buildAiUsageFromResponse({
      response,
      model: selectedModel,
    }),
  };
}

export async function compareWorkspaceDocuments({
  workspaceId,
  topic,
  firstDocumentId,
  firstDocumentName,
  secondDocumentId,
  secondDocumentName,
  limit = 4,
} = {}) {
  const [
    firstSourceChunks,
    secondSourceChunks,
  ] = await Promise.all([
    searchWorkspaceChunks({
      workspaceId,
      query: topic,
      limit,
      documentIds: [firstDocumentId],
    }),
    searchWorkspaceChunks({
      workspaceId,
      query: topic,
      limit,
      documentIds: [secondDocumentId],
    }),
  ]);

  return generateComparisonAnswer({
    topic,
    firstDocumentName,
    secondDocumentName,
    firstSourceChunks,
    secondSourceChunks,
  });
}

export async function extractWorkspaceFields({
  workspaceId,
  prompt,
  limit = 8,
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
      fields: [],
      recordSets: [],
      groups: [],
      rawJson:
        "{\"fields\":[],\"recordSets\":[]}",
      sources: [],
      model: env.geminiGenerativeModel,
      usage: null,
    };
  }

  return generateStructuredExtraction({
    prompt,
    sourceChunks,
  });
}
