import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";
import { cascadeDeleteDocumentData } from "../services/workspaceCascadeService.js";

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const backendRootDirectory = path.resolve(
  currentDirectory,
  "../.."
);

const extensionToFormat = {
  ".pdf": "PDF",
  ".docx": "DOCX",
  ".txt": "TXT",
  ".csv": "CSV",
};

function formatDocument(document) {
  return {
    id: document._id,
    workspaceId: document.workspaceId,
    filename: document.filename,
    originalName: document.originalName,
    format: document.format,
    pageCount: document.pageCount,
    fileSize: document.fileSize,
    status: document.status,
    filePath: document.filePath,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function getDocumentFormat(filename) {
  const extension = path
    .extname(filename)
    .toLowerCase();

  return extensionToFormat[extension];
}

function getStoredFilePath(filename) {
  return path.posix.join(
    "uploads",
    "documents",
    filename
  );
}

function getOriginalName(req) {
  const requestedName =
    typeof req.body?.originalName === "string"
      ? req.body.originalName.trim()
      : "";

  return requestedName || req.file.originalname;
}

async function findWorkspaceForUser({
  workspaceId,
  userId,
}) {
  return Workspace.findOne({
    _id: workspaceId,
    userId,
  });
}

async function documentNameExists({
  workspaceId,
  originalName,
  documentId,
}) {
  const query = {
    workspaceId,
    originalName,
  };

  if (documentId) {
    query._id = {
      $ne: documentId,
    };
  }

  const existingDocument =
    await Document.findOne(query).collation({
      locale: "en",
      strength: 2,
    });

  return Boolean(existingDocument);
}

function sendDuplicateDocumentNameResponse(res) {
  return res.status(409).json({
    success: false,
    message:
      "A document with this name already exists in this workspace.",
  });
}

async function removeUploadedFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function removeStoredDocumentFile(document) {
  await removeUploadedFile(
    path.resolve(
      backendRootDirectory,
      document.filePath
    )
  );
}

export async function getDocuments(req, res, next) {
  try {
    const workspace =
      await findWorkspaceForUser({
        workspaceId: req.params.id,
        userId: req.user._id,
      });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    const documents = await Document.find({
      workspaceId: workspace._id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      documents: documents.map(formatDocument),
    });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required.",
      });
    }

    const workspace =
      await findWorkspaceForUser({
        workspaceId: req.params.id,
        userId: req.user._id,
      });

    if (!workspace) {
      await removeUploadedFile(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    const format = getDocumentFormat(
      req.file.originalname
    );

    if (!format) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "Only PDF, DOCX, TXT, and CSV files are supported.",
      });
    }

    const originalName = getOriginalName(req);

    if (originalName.length > 255) {
      await removeUploadedFile(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          "Original filename cannot exceed 255 characters.",
      });
    }

    const duplicateName =
      await documentNameExists({
        workspaceId: workspace._id,
        originalName,
      });

    if (duplicateName) {
      await removeUploadedFile(req.file.path);

      return sendDuplicateDocumentNameResponse(res);
    }

    const document = await Document.create({
      workspaceId: workspace._id,
      filename: req.file.filename,
      originalName,
      format,
      pageCount: 0,
      fileSize: req.file.size,
      status: "uploaded",
      filePath: getStoredFilePath(
        req.file.filename
      ),
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document: formatDocument(document),
    });
  } catch (error) {
    if (req.file?.path) {
      try {
        await removeUploadedFile(req.file.path);
      } catch {
        // Keep the original error as the API failure.
      }
    }

    next(error);
  }
}

export async function updateDocument(req, res, next) {
  try {
    const workspace =
      await findWorkspaceForUser({
        workspaceId: req.params.id,
        userId: req.user._id,
      });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    const duplicateName =
      await documentNameExists({
        workspaceId: workspace._id,
        originalName: req.body.originalName,
        documentId: req.params.documentId,
      });

    if (duplicateName) {
      return sendDuplicateDocumentNameResponse(res);
    }

    const document =
      await Document.findOneAndUpdate(
        {
          _id: req.params.documentId,
          workspaceId: workspace._id,
        },
        {
          originalName: req.body.originalName,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Document updated successfully.",
      document: formatDocument(document),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const workspace =
      await findWorkspaceForUser({
        workspaceId: req.params.id,
        userId: req.user._id,
      });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    const document = await Document.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const deletedRelatedData =
      await cascadeDeleteDocumentData({
        documentId: document._id,
      });

    await removeStoredDocumentFile(document);

    await Document.deleteOne({
      _id: document._id,
      workspaceId: workspace._id,
    });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      deleted: {
        document: 1,
        ...deletedRelatedData,
      },
    });
  } catch (error) {
    next(error);
  }
}
