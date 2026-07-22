import fs from "node:fs/promises";
import path from "node:path";

import Document from "../models/Document.js";
import Workspace from "../models/Workspace.js";

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

async function removeUploadedFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
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

    const workspace = await Workspace.findOne({
      _id: req.params.id,
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

    const document = await Document.create({
      workspaceId: workspace._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
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
