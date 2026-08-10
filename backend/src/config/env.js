import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);
const geminiEmbeddingBatchSize = Number(
  process.env.GEMINI_EMBEDDING_BATCH_SIZE ?? 8
);
const geminiEmbeddingRequestDelayMs = Number(
  process.env.GEMINI_EMBEDDING_REQUEST_DELAY_MS ?? 250
);
const geminiEmbeddingTimeoutMs = Number(
  process.env.GEMINI_EMBEDDING_TIMEOUT_MS ?? 30000
);
const geminiGenerativeTimeoutMs = Number(
  process.env.GEMINI_GENERATIVE_TIMEOUT_MS ?? 30000
);
const r2ConfigValues = [
  process.env.R2_ACCOUNT_ID,
  process.env.R2_ACCESS_KEY_ID,
  process.env.R2_SECRET_ACCESS_KEY,
  process.env.R2_BUCKET_NAME,
  process.env.R2_ENDPOINT,
];
const hasR2Config = r2ConfigValues.every(Boolean);
const hasPartialR2Config =
  r2ConfigValues.some(Boolean) && !hasR2Config;
const documentStorageProvider =
  process.env.DOCUMENT_STORAGE_PROVIDER ??
  (hasR2Config ? "r2" : "local");

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

if (
  !Number.isInteger(geminiEmbeddingBatchSize) ||
  geminiEmbeddingBatchSize <= 0
) {
  throw new Error(
    "GEMINI_EMBEDDING_BATCH_SIZE must be a positive integer."
  );
}

if (
  !Number.isInteger(geminiEmbeddingRequestDelayMs) ||
  geminiEmbeddingRequestDelayMs < 0
) {
  throw new Error(
    "GEMINI_EMBEDDING_REQUEST_DELAY_MS must be a non-negative integer."
  );
}

if (
  !Number.isInteger(geminiEmbeddingTimeoutMs) ||
  geminiEmbeddingTimeoutMs <= 0
) {
  throw new Error(
    "GEMINI_EMBEDDING_TIMEOUT_MS must be a positive integer."
  );
}

if (
  !Number.isInteger(geminiGenerativeTimeoutMs) ||
  geminiGenerativeTimeoutMs <= 0
) {
  throw new Error(
    "GEMINI_GENERATIVE_TIMEOUT_MS must be a positive integer."
  );
}

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from the .env file.");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file.");
}

if (!["local", "r2"].includes(documentStorageProvider)) {
  throw new Error(
    "DOCUMENT_STORAGE_PROVIDER must be either local or r2."
  );
}

if (
  (documentStorageProvider === "r2" || hasPartialR2Config) &&
  !hasR2Config
) {
  throw new Error(
    "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_ENDPOINT are required for R2 storage."
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiEmbeddingModel:
    process.env.GEMINI_EMBEDDING_MODEL ??
    "gemini-embedding-2",
  geminiEmbeddingBatchSize,
  geminiEmbeddingRequestDelayMs,
  geminiEmbeddingTimeoutMs,
  geminiGenerativeModel:
    process.env.GEMINI_GENERATIVE_MODEL ??
    "gemini-flash-latest",
  geminiGenerativeTimeoutMs,
  vectorSearchIndexName:
    process.env.VECTOR_SEARCH_INDEX_NAME ??
    "chunk_embedding_vector_index",
  documentStorageProvider,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2BucketName: process.env.R2_BUCKET_NAME,
  r2Endpoint: process.env.R2_ENDPOINT?.replace(/\/+$/, ""),
};
