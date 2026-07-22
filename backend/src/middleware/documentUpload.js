import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import multer from "multer";

const currentDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const uploadDirectory = path.resolve(
  currentDirectory,
  "../../uploads/documents"
);

const maxDocumentFileSize =
  100 * 1024 * 1024;

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
]);

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
]);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

function createUploadError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function getExtension(file) {
  return path
    .extname(file.originalname)
    .toLowerCase();
}

function sanitizeFilename(value) {
  return (
    value
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "document"
  );
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = getExtension(file);
    const basename = sanitizeFilename(
      path.basename(file.originalname, extension)
    );

    callback(
      null,
      `${Date.now()}-${randomUUID()}-${basename}${extension}`
    );
  },
});

function fileFilter(_req, file, callback) {
  const extension = getExtension(file);

  if (
    allowedExtensions.has(extension) &&
    allowedMimeTypes.has(file.mimetype)
  ) {
    callback(null, true);
    return;
  }

  callback(
    createUploadError(
      "Only PDF, DOCX, TXT, and CSV files are supported."
    )
  );
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: maxDocumentFileSize,
  },
});

export function uploadDocumentFile(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const uploadError = createUploadError(
        error.code === "LIMIT_FILE_SIZE"
          ? "Document file cannot exceed 100MB."
          : "Unable to upload document file."
      );

      next(uploadError);
      return;
    }

    next(error);
  });
}
