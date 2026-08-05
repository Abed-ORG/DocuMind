import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";
import {
  answerWorkspaceQuestion,
  extractWorkspaceFields,
} from "../services/ragAnswerService.js";
import { searchWorkspaceChunks } from "../services/vectorSearchService.js";

async function findUserWorkspace(req) {
  return Workspace.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
}

function sendWorkspaceNotFound(res) {
  return res.status(404).json({
    success: false,
    message: "Workspace not found.",
  });
}

async function validateWorkspaceDocuments({
  workspaceId,
  documentIds,
}) {
  const normalizedDocumentIds = [
    ...new Set(
      (documentIds ?? [])
        .map((documentId) =>
          String(documentId ?? "").trim()
        )
        .filter(Boolean)
    ),
  ];

  if (normalizedDocumentIds.length === 0) {
    return {
      documentIds: [],
      documents: [],
    };
  }

  const documents = await Document.find({
    _id: {
      $in: normalizedDocumentIds,
    },
    workspaceId,
  });

  if (
    documents.length !== normalizedDocumentIds.length
  ) {
    const error = new Error(
      "One or more documents were not found in this workspace."
    );

    error.statusCode = 404;
    throw error;
  }

  const hasUnreadyDocument = documents.some(
    (document) => document.status !== "ready"
  );

  if (hasUnreadyDocument) {
    const error = new Error(
      "Selected documents must finish processing before extraction."
    );

    error.statusCode = 409;
    throw error;
  }

  return {
    documentIds: normalizedDocumentIds,
    documents,
  };
}

export async function searchWorkspace(req, res, next) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const results = await searchWorkspaceChunks({
      workspaceId: workspace._id,
      query: req.body.query,
      limit: req.body.limit,
    });

    return res.status(200).json({
      success: true,
      query: req.body.query.trim(),
      results,
    });
  } catch (error) {
    next(error);
  }
}

export async function answerWorkspace(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const result = await answerWorkspaceQuestion({
      workspaceId: workspace._id,
      question: req.body.query,
      limit: req.body.limit,
      documentIds: req.body.documentIds,
      conversationHistory:
        req.body.conversationHistory,
    });

    return res.status(200).json({
      success: true,
      query: req.body.query.trim(),
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function extractWorkspace(
  req,
  res,
  next
) {
  try {
    const workspace = await findUserWorkspace(req);

    if (!workspace) {
      return sendWorkspaceNotFound(res);
    }

    const {
      documentIds,
      documents,
    } = await validateWorkspaceDocuments({
      workspaceId: workspace._id,
      documentIds: req.body.documentIds,
    });
    const result = await extractWorkspaceFields({
      workspaceId: workspace._id,
      prompt: req.body.prompt,
      limit: req.body.limit,
      documentIds,
    });

    return res.status(200).json({
      success: true,
      prompt: req.body.prompt.trim(),
      documents: documents.map((document) => ({
        id: document._id.toString(),
        name: document.originalName,
        status: document.status,
      })),
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
