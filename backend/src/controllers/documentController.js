import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import Document from "../models/Document.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { replaceDocumentChunks } from "../services/chunkingService.js";
import { embedDocumentChunks } from "../services/embeddingService.js";
import { cascadeDeleteDocumentData } from "../services/workspaceCascadeService.js";

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const backendRootDirectory = path.resolve(
  currentDirectory,
  "../.."
);

const maxPreviewCharacters = 120000;
const maxCsvPreviewBytes = 512 * 1024;
const maxCsvPreviewRows = 50;
const maxCsvPreviewColumns = 16;
const maxCsvCellCharacters = 160;

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
    contentHash: document.contentHash,
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

async function documentContentDuplicateExists({
  workspaceId,
  originalName,
  contentHash,
}) {
  const existingDocument =
    await Document.findOne({
      workspaceId,
      originalName,
      contentHash,
    }).collation({
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

function sendDuplicateDocumentContentResponse(res) {
  return res.status(409).json({
    success: false,
    message:
      "This exact file already exists in this workspace.",
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

async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);

  return createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
}

async function backfillMissingHashesForName({
  workspaceId,
  originalName,
}) {
  const documents = await Document.find({
    workspaceId,
    originalName,
    $or: [
      {
        contentHash: {
          $exists: false,
        },
      },
      {
        contentHash: null,
      },
      {
        contentHash: "",
      },
    ],
  }).collation({
    locale: "en",
    strength: 2,
  });

  await Promise.all(
    documents.map(async (document) => {
      try {
        const contentHash = await calculateFileHash(
          getAbsoluteDocumentPath(document)
        );

        await Document.updateOne(
          {
            _id: document._id,
          },
          {
            contentHash,
          }
        );
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    })
  );
}

async function incrementUserStorage({
  userId,
  bytes,
}) {
  await User.updateOne(
    {
      _id: userId,
    },
    {
      $inc: {
        storageUsedBytes: bytes,
      },
    }
  );
}

async function decrementUserStorage({
  userId,
  bytes,
}) {
  await User.updateOne(
    {
      _id: userId,
    },
    {
      $inc: {
        storageUsedBytes: -bytes,
      },
    }
  );

  await User.updateOne(
    {
      _id: userId,
      storageUsedBytes: {
        $lt: 0,
      },
    },
    {
      storageUsedBytes: 0,
    }
  );
}

function getAbsoluteDocumentPath(document) {
  return path.resolve(
    backendRootDirectory,
    document.filePath
  );
}

function normalizePreviewText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function limitPreviewText(value) {
  const text = normalizePreviewText(value);

  if (text.length <= maxPreviewCharacters) {
    return {
      text,
      isTruncated: false,
    };
  }

  return {
    text: text.slice(0, maxPreviewCharacters).trimEnd(),
    isTruncated: true,
  };
}

function cleanCsvCell(value) {
  const normalized = String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxCsvCellCharacters) {
    return normalized;
  }

  return `${normalized
    .slice(0, maxCsvCellCharacters)
    .trimEnd()}...`;
}

function parseCsvRows(text, rowLimit) {
  const rows = [];
  let row = [];
  let field = "";
  let isQuoted = false;

  const source = String(text ?? "").replace(
    /^\uFEFF/,
    ""
  );

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === "\"") {
      if (isQuoted && source[index + 1] === "\"") {
        field += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }

      continue;
    }

    if (character === "," && !isQuoted) {
      row.push(field);
      field = "";
      continue;
    }

    if (
      (character === "\n" || character === "\r") &&
      !isQuoted
    ) {
      if (
        character === "\r" &&
        source[index + 1] === "\n"
      ) {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";

      if (rows.length >= rowLimit) {
        return rows;
      }

      continue;
    }

    field += character;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function isMissingCsvValue(value) {
  return /^(na|n\/a|null|none)$/i.test(
    cleanCsvCell(value)
  );
}

function isNumericCsvValue(value) {
  const cell = cleanCsvCell(value);

  return (
    /^[-+]?\d[\d,.]*%?$/.test(cell) ||
    /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(cell)
  );
}

function isHeaderishCsvValue(value) {
  const cell = cleanCsvCell(value);

  return (
    /^[A-Za-z_][A-Za-z0-9_ .-]{0,80}$/.test(cell) &&
    !isMissingCsvValue(cell) &&
    !isNumericCsvValue(cell)
  );
}

function isLikelyCsvHeader(row, nextRow) {
  const cells = row
    .map(cleanCsvCell)
    .filter(Boolean);

  if (cells.length === 0 || !nextRow) {
    return false;
  }

  const headerishCount = cells.filter(
    isHeaderishCsvValue
  ).length;
  const dataLikeCount = cells.filter(
    (cell) =>
      isMissingCsvValue(cell) ||
      isNumericCsvValue(cell) ||
      cell.includes("://")
  ).length;

  return (
    headerishCount / cells.length >= 0.55 &&
    dataLikeCount / cells.length <= 0.35
  );
}

function createCsvPreviewTable({
  text,
  fileSize,
  bytesRead,
}) {
  const parsedRows = parseCsvRows(
    text,
    maxCsvPreviewRows + 1
  ).filter((row) =>
    row.some((cell) => cleanCsvCell(cell))
  );

  if (parsedRows.length === 0) {
    return {
      type: "table",
      columns: [],
      rows: [],
      isTruncated: fileSize > bytesRead,
    };
  }

  const headerRow = parsedRows[0];
  const hasHeader = isLikelyCsvHeader(
    headerRow,
    parsedRows[1]
  );
  const bodyRows = hasHeader
    ? parsedRows.slice(1)
    : parsedRows;
  const visibleRows = bodyRows.slice(
    0,
    maxCsvPreviewRows
  );
  const columnSourceRows = [
    headerRow,
    ...visibleRows,
  ];
  const columnCount = Math.max(
    headerRow.length,
    ...columnSourceRows.map((row) => row.length)
  );
  const visibleColumnCount = Math.min(
    columnCount,
    maxCsvPreviewColumns
  );
  const columns = Array.from(
    {
      length: visibleColumnCount,
    },
    (_, index) =>
      (hasHeader && cleanCsvCell(headerRow[index])) ||
      `Column ${index + 1}`
  );

  const rows = visibleRows.map((row, rowIndex) => ({
    rowNumber: hasHeader ? rowIndex + 2 : rowIndex + 1,
    cells: columns.map((_, columnIndex) =>
      cleanCsvCell(row[columnIndex])
    ),
  }));

  return {
    type: "table",
    columns,
    rows,
    hasHeader,
    isTruncated:
      fileSize > bytesRead ||
      parsedRows.length > maxCsvPreviewRows ||
      columnCount > maxCsvPreviewColumns,
    totalColumnsPreviewed: visibleColumnCount,
    maxRows: maxCsvPreviewRows,
    maxColumns: maxCsvPreviewColumns,
  };
}

function createPreviewPages(
  pages,
  fallbackText = ""
) {
  const normalizedPages = [];
  let remainingCharacters = maxPreviewCharacters;

  for (const [index, page] of pages.entries()) {
    if (remainingCharacters <= 0) {
      break;
    }

    const text = normalizePreviewText(page.text);

    if (!text) {
      continue;
    }

    const isTruncated =
      text.length > remainingCharacters;
    const previewText = isTruncated
      ? text.slice(0, remainingCharacters).trimEnd()
      : text;

    normalizedPages.push({
      pageNumber: page.pageNumber ?? index + 1,
      text: previewText,
      isTruncated,
    });

    remainingCharacters -= previewText.length;

    if (isTruncated) {
      break;
    }
  }

  if (normalizedPages.length > 0) {
    return normalizedPages;
  }

  const {
    text,
    isTruncated,
  } = limitPreviewText(fallbackText);

  return [
    {
      pageNumber: 1,
      text:
        text ||
        "No extracted text is available for this document yet.",
      isTruncated,
    },
  ];
}

function createExtractedPages(
  pages,
  fallbackText = ""
) {
  const normalizedPages = pages
    .map((page, index) => ({
      pageNumber: page.pageNumber ?? index + 1,
      text: normalizePreviewText(page.text),
    }))
    .filter((page) => page.text.length > 0);

  if (normalizedPages.length > 0) {
    return normalizedPages;
  }

  const text = normalizePreviewText(fallbackText);

  if (!text) {
    return [];
  }

  return [
    {
      pageNumber: 1,
      text,
    },
  ];
}

async function extractPdfPreview(filePath) {
  const data = await fs.readFile(filePath);
  const parser = new PDFParse({
    data,
  });

  try {
    const result = await parser.getText();

    return createPreviewPages(
      result.pages.map((page) => ({
        pageNumber: page.num,
        text: page.text,
      })),
      result.text
    );
  } finally {
    await parser.destroy();
  }
}

async function extractPdfTextPages(filePath) {
  const data = await fs.readFile(filePath);
  const parser = new PDFParse({
    data,
  });

  try {
    const result = await parser.getText();

    return createExtractedPages(
      result.pages.map((page) => ({
        pageNumber: page.num,
        text: page.text,
      })),
      result.text
    );
  } finally {
    await parser.destroy();
  }
}

async function extractDocxPreview(filePath) {
  const result = await mammoth.extractRawText({
    path: filePath,
  });

  return createPreviewPages([], result.value);
}

async function extractDocxTextPages(filePath) {
  const result = await mammoth.extractRawText({
    path: filePath,
  });

  return createExtractedPages([], result.value);
}

async function extractPlainTextPreview(filePath) {
  const text = await fs.readFile(filePath, "utf8");

  return createPreviewPages([], text);
}

async function extractPlainTextPages(filePath) {
  const text = await fs.readFile(filePath, "utf8");

  return createExtractedPages([], text);
}

async function extractCsvPreview(filePath) {
  const {
    size,
  } = await fs.stat(filePath);
  const fileHandle = await fs.open(filePath, "r");
  const buffer = Buffer.alloc(
    Math.min(size, maxCsvPreviewBytes)
  );

  try {
    const {
      bytesRead,
    } = await fileHandle.read(
      buffer,
      0,
      buffer.length,
      0
    );

    return createCsvPreviewTable({
      text: buffer
        .subarray(0, bytesRead)
        .toString("utf8"),
      fileSize: size,
      bytesRead,
    });
  } finally {
    await fileHandle.close();
  }
}

async function extractCsvTextPages(filePath) {
  const text = await fs.readFile(filePath, "utf8");

  return createExtractedPages([], text);
}

async function extractDocumentPreview(document) {
  const filePath = getAbsoluteDocumentPath(document);

  if (document.format === "PDF") {
    return {
      type: "text",
      pages: await extractPdfPreview(filePath),
    };
  }

  if (document.format === "DOCX") {
    return {
      type: "text",
      pages: await extractDocxPreview(filePath),
    };
  }

  if (document.format === "CSV") {
    return {
      type: "table",
      table: await extractCsvPreview(filePath),
      pages: [],
    };
  }

  return {
    type: "text",
    pages: await extractPlainTextPreview(filePath),
  };
}

async function extractDocumentTextPages(document) {
  const filePath = getAbsoluteDocumentPath(document);

  if (document.format === "PDF") {
    return extractPdfTextPages(filePath);
  }

  if (document.format === "DOCX") {
    return extractDocxTextPages(filePath);
  }

  if (document.format === "CSV") {
    return extractCsvTextPages(filePath);
  }

  return extractPlainTextPages(filePath);
}

async function chunkDocumentText(document) {
  const pages = await extractDocumentTextPages(document);

  const chunks = await replaceDocumentChunks({
    documentId: document._id,
    workspaceId: document.workspaceId,
    pages,
  });

  document.pageCount =
    pages.length > 0
      ? Math.max(
          ...pages.map((page) => page.pageNumber)
        )
      : 0;
  document.status = "ready";

  await document.save();

  return chunks.length;
}

async function findDocumentInWorkspace({
  workspaceId,
  documentId,
}) {
  return Document.findOne({
    _id: documentId,
    workspaceId,
  });
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

export async function getDocumentPreview(req, res, next) {
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

    const document =
      await findDocumentInWorkspace({
        workspaceId: workspace._id,
        documentId: req.params.documentId,
      });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const previewData =
      await extractDocumentPreview(document);

    return res.status(200).json({
      success: true,
      preview: {
        document: formatDocument(document),
        ...previewData,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message:
          "The stored document file could not be found.",
      });
    }

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

    const contentHash = await calculateFileHash(
      req.file.path
    );

    await backfillMissingHashesForName({
      workspaceId: workspace._id,
      originalName,
    });

    const duplicateContent =
      await documentContentDuplicateExists({
        workspaceId: workspace._id,
        originalName,
        contentHash,
      });

    if (duplicateContent) {
      await removeUploadedFile(req.file.path);

      return sendDuplicateDocumentContentResponse(res);
    }

    const document = await Document.create({
      workspaceId: workspace._id,
      filename: req.file.filename,
      originalName,
      format,
      pageCount: 0,
      fileSize: req.file.size,
      contentHash,
      status: "uploaded",
      filePath: getStoredFilePath(
        req.file.filename
      ),
    });

    try {
      await incrementUserStorage({
        userId: req.user._id,
        bytes: req.file.size,
      });
    } catch (error) {
      console.error(
        "Failed to increment user storage:",
        error
      );
    }

    await Document.updateOne(
      {
        _id: document._id,
      },
      {
        status: "processing",
      }
    );
    document.status = "processing";

    let chunksCreated = 0;
    let embeddingsCreated = 0;
    let processingError = null;

    try {
      chunksCreated =
        await chunkDocumentText(document);
      const embeddingResult =
        await embedDocumentChunks(document._id);

      embeddingsCreated =
        embeddingResult.embeddedChunks;
    } catch (error) {
      processingError = error;
      document.status = "failed";

      await Document.updateOne(
        {
          _id: document._id,
        },
        {
          status: "failed",
        }
      );

      console.error(
        "Failed to process uploaded document:",
        error
      );
    }

    return res.status(201).json({
      success: true,
      message: processingError
        ? "Document uploaded, but processing failed."
        : "Document uploaded, chunked, and embedded successfully.",
      document: formatDocument(document),
      processing: {
        chunksCreated,
        embeddingsCreated,
      },
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

    try {
      await decrementUserStorage({
        userId: req.user._id,
        bytes: document.fileSize,
      });
    } catch (error) {
      console.error(
        "Failed to decrement user storage:",
        error
      );
    }

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
