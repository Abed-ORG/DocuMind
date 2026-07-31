import mongoose from "mongoose";

import { env } from "../config/env.js";
import Chunk from "../models/Chunk.js";
import { embedQuery } from "./embeddingService.js";

const defaultLimit = 5;
const maxLimit = 20;
const minNumCandidates = 50;

function normalizeLimit(limit) {
  const numericLimit = Number(limit ?? defaultLimit);

  if (!Number.isInteger(numericLimit)) {
    return defaultLimit;
  }

  return Math.min(
    Math.max(numericLimit, 1),
    maxLimit
  );
}

function normalizeQuery(query) {
  return String(query ?? "").trim();
}

function toObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return new mongoose.Types.ObjectId(value);
}

function toObjectIds(values = [], fieldName) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    ),
  ].map((value) => toObjectId(value, fieldName));
}

function formatSearchResult(result) {
  return {
    chunkId: result.chunkId?.toString(),
    documentId: result.documentId?.toString(),
    documentName:
      result.documentName ?? result.filename ?? "",
    pageNumber: result.pageNumber,
    chunkIndex: result.chunkIndex,
    sectionHeader: result.sectionHeader ?? "",
    text: result.text,
    score: result.score,
  };
}

export async function searchWorkspaceChunks({
  workspaceId,
  query,
  limit,
  numCandidates,
  documentIds,
} = {}) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const workspaceObjectId = toObjectId(
    workspaceId,
    "Workspace id"
  );
  const normalizedLimit = normalizeLimit(limit);
  const normalizedNumCandidates =
    numCandidates ??
    Math.max(normalizedLimit * 10, minNumCandidates);
  const documentObjectIds = toObjectIds(
    documentIds,
    "Document id"
  );
  const queryVector = await embedQuery(normalizedQuery);
  const vectorFilter = {
    workspaceId: workspaceObjectId,
    ...(documentObjectIds.length > 0 && {
      documentId: {
        $in: documentObjectIds,
      },
    }),
  };

  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: env.vectorSearchIndexName,
        path: "embedding",
        queryVector,
        numCandidates: normalizedNumCandidates,
        limit: normalizedLimit,
        filter: vectorFilter,
      },
    },
    {
      $set: {
        score: {
          $meta: "vectorSearchScore",
        },
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "documentId",
        foreignField: "_id",
        as: "document",
      },
    },
    {
      $unwind: {
        path: "$document",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        chunkId: "$_id",
        documentId: 1,
        documentName: "$document.originalName",
        filename: "$document.filename",
        pageNumber: 1,
        chunkIndex: 1,
        sectionHeader: 1,
        text: 1,
        score: 1,
      },
    },
  ]);

  return results.map(formatSearchResult);
}
