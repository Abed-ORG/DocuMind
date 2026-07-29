import { GoogleGenAI } from "@google/genai";

import { env } from "../config/env.js";
import Chunk, {
  CHUNK_EMBEDDING_DIMENSIONS,
} from "../models/Chunk.js";

const defaultRetryOptions = {
  maxRetries: 3,
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
      "GEMINI_API_KEY is required to generate embeddings."
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

function chunkArray(items, size) {
  const chunks = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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
    error?.message === "Gemini embedding request timed out." ||
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
        "Gemini embedding request timed out."
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

function validateEmbedding(embedding) {
  return (
    Array.isArray(embedding) &&
    embedding.length === CHUNK_EMBEDDING_DIMENSIONS &&
    embedding.every((value) => Number.isFinite(value))
  );
}

function getEmbeddingValues(response) {
  const embeddings = response?.embeddings ?? [];

  return embeddings.map((embedding) => embedding.values);
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

export async function embedTexts(texts, options = {}) {
  const inputTexts = texts
    .map((text) => String(text ?? "").trim())
    .filter(Boolean);

  if (inputTexts.length === 0) {
    return [];
  }

  const client = getGeminiClient();
  const timeoutMs =
    options.timeoutMs ??
    env.geminiEmbeddingTimeoutMs;
  const response = await withRetry(
    () =>
      withTimeout(
        client.models.embedContent({
          model:
            options.model ?? env.geminiEmbeddingModel,
          contents: inputTexts.map((text) => ({
            parts: [
              {
                text,
              },
            ],
          })),
          config: {
            outputDimensionality:
              CHUNK_EMBEDDING_DIMENSIONS,
            taskType: "RETRIEVAL_DOCUMENT",
          },
        }),
        timeoutMs
      ),
    options.retry
  );
  const embeddings = getEmbeddingValues(response);

  if (embeddings.length !== inputTexts.length) {
    throw new Error(
      "Gemini returned a different number of embeddings than requested."
    );
  }

  embeddings.forEach((embedding) => {
    if (!validateEmbedding(embedding)) {
      throw new Error(
        `Gemini embedding must contain ${CHUNK_EMBEDDING_DIMENSIONS} finite numbers.`
      );
    }
  });

  return embeddings;
}

export async function embedText(text, options = {}) {
  const [embedding] = await embedTexts(
    [text],
    options
  );

  return embedding;
}

export async function embedChunks(chunks, options = {}) {
  const batchSize =
    options.batchSize ??
    env.geminiEmbeddingBatchSize;
  const requestDelayMs =
    options.requestDelayMs ??
    env.geminiEmbeddingRequestDelayMs;
  const embeddedChunks = [];

  for (const batch of chunkArray(chunks, batchSize)) {
    const embeddings = await embedTexts(
      batch.map((chunk) => chunk.text),
      options
    );

    batch.forEach((chunk, index) => {
      embeddedChunks.push({
        chunk,
        embedding: embeddings[index],
      });
    });

    if (requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  return embeddedChunks;
}

export async function embedDocumentChunks(
  documentId,
  options = {}
) {
  const chunks = await Chunk.find({
    documentId,
    $or: [
      {
        embedding: {
          $exists: false,
        },
      },
      {
        embedding: null,
      },
      {
        embedding: {
          $size: 0,
        },
      },
    ],
  }).sort({
    chunkIndex: 1,
  });

  if (chunks.length === 0) {
    return {
      matchedChunks: 0,
      embeddedChunks: 0,
    };
  }

  const embeddedChunks = await embedChunks(
    chunks,
    options
  );

  await Promise.all(
    embeddedChunks.map(
      async ({ chunk, embedding }) => {
        chunk.embedding = embedding;
        await chunk.save();
      }
    )
  );

  return {
    matchedChunks: chunks.length,
    embeddedChunks: embeddedChunks.length,
  };
}
