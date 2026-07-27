import {
  File,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import {
  maxUploadSizeBytes,
  navItems,
  supportedUploadExtensions,
} from "./workspaceData";

export function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  return `${first}${last}` || "DM";
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatUploadedAt(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function mapApiDocument(document) {
  return {
    id: document.id,
    name: document.originalName,
    format: document.format,
    pages: document.pageCount ?? 0,
    size: formatFileSize(document.fileSize),
    uploadedAt: formatUploadedAt(document.createdAt),
    status: document.status ?? "uploaded",
  };
}

export function createUploadId(file) {
  return [
    file.name,
    file.size,
    file.lastModified,
    Math.random().toString(36).slice(2),
  ].join("-");
}

export function getFileExtension(file) {
  return file.name
    .split(".")
    .pop()
    ?.toLowerCase();
}

export function validateUploadFile(file) {
  const extension = getFileExtension(file);

  if (!supportedUploadExtensions.has(extension)) {
    return `${file.name} is not supported. Use PDF, DOCX, TXT, or CSV.`;
  }

  if (file.size > maxUploadSizeBytes) {
    return `${file.name} is larger than 100MB.`;
  }

  return "";
}

export function normalizeDocumentName(name) {
  return name.trim().toLowerCase();
}

export function documentNameExists(
  name,
  existingNames
) {
  const normalizedName =
    normalizeDocumentName(name);

  return existingNames.some(
    (existingName) =>
      normalizeDocumentName(existingName) ===
      normalizedName
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitDocumentName(name) {
  const trimmedName = name.trim();
  const extensionStartIndex =
    trimmedName.lastIndexOf(".");

  if (extensionStartIndex <= 0) {
    return {
      baseName: trimmedName,
      extension: "",
    };
  }

  return {
    baseName: trimmedName.slice(
      0,
      extensionStartIndex
    ),
    extension: trimmedName.slice(extensionStartIndex),
  };
}

export function getDuplicateDocumentName(
  name,
  existingNames
) {
  const {
    baseName,
    extension,
  } = splitDocumentName(name);

  const duplicatePattern = new RegExp(
    `^${escapeRegExp(baseName)} copy(\\d+)${escapeRegExp(
      extension
    )}$`,
    "i"
  );

  const highestCopyNumber = existingNames.reduce(
    (highest, existingName) => {
      const match = existingName.match(
        duplicatePattern
      );

      if (!match) {
        return highest;
      }

      const copyNumber = Number(match[1]);

      return Number.isFinite(copyNumber)
        ? Math.max(highest, copyNumber)
        : highest;
    },
    0
  );

  return `${baseName} copy${highestCopyNumber + 1}${extension}`;
}

export function getUploadStatusLabel(status) {
  if (status === "complete") {
    return "Uploaded";
  }

  if (status === "queued") {
    return "Queued";
  }

  return "Uploading";
}

export function getFormatIcon(format) {
  if (format === "CSV") {
    return FileSpreadsheet;
  }

  if (format === "TXT") {
    return File;
  }

  return FileText;
}

export function getActiveSection(pathname) {
  const section = pathname
    .split("/")
    .filter(Boolean)
    .at(-1);

  return navItems.some((item) => item.key === section)
    ? section
    : "documents";
}
