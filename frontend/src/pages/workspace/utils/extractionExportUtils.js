const textEncoder = new TextEncoder();
const zipUtf8Flag = 0x0800;

function escapeCsvCell(cell) {
  return `"${String(cell ?? "").replace(/"/g, '""')}"`;
}

function toCsvRows(group) {
  const columns = Array.isArray(group?.columns)
    ? group.columns
    : [];
  const rows = Array.isArray(group?.rows)
    ? group.rows
    : [];

  return [
    columns.map((column) => column.label ?? column.key),
    ...rows.map((row) =>
      columns.map(
        (column) => row?.values?.[column.key] ?? ""
      )
    ),
  ];
}

export function buildGroupCsv(group) {
  return toCsvRows(group)
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function sanitizeExtractionFilename(
  value,
  fallback = "extraction-results"
) {
  const filename = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return filename || fallback;
}

function buildCsvFiles(groups = []) {
  const usedNames = new Map();

  return groups
    .filter(
      (group) =>
        Array.isArray(group?.columns) &&
        group.columns.length > 0 &&
        Array.isArray(group?.rows) &&
        group.rows.length > 0
    )
    .map((group, index) => {
      const baseName = sanitizeExtractionFilename(
        group?.title,
        `extraction-results-${index + 1}`
      );
      const count = usedNames.get(baseName) ?? 0;
      const nextCount = count + 1;

      usedNames.set(baseName, nextCount);

      return {
        filename:
          nextCount === 1
            ? `${baseName}.csv`
            : `${baseName}-${nextCount}.csv`,
        content: buildGroupCsv(group),
      };
    });
}

const crcTable = Array.from(
  {
    length: 256,
  },
  (_, index) => {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        crc & 1
          ? 0xedb88320 ^ (crc >>> 1)
          : crc >>> 1;
    }

    return crc >>> 0;
  }
);

function getCrc32(bytes) {
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

function createBuffer(size) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);

  return {
    bytes,
    view,
  };
}

function writeLocalHeader({
  filenameBytes,
  contentBytes,
  crc,
  modified,
}) {
  const {
    bytes,
    view,
  } = createBuffer(30 + filenameBytes.length);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, zipUtf8Flag, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, modified.time, true);
  view.setUint16(12, modified.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, contentBytes.length, true);
  view.setUint32(22, contentBytes.length, true);
  view.setUint16(26, filenameBytes.length, true);
  view.setUint16(28, 0, true);
  bytes.set(filenameBytes, 30);

  return bytes;
}

function writeCentralDirectoryHeader({
  filenameBytes,
  contentBytes,
  crc,
  modified,
  localHeaderOffset,
}) {
  const {
    bytes,
    view,
  } = createBuffer(46 + filenameBytes.length);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, zipUtf8Flag, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, modified.time, true);
  view.setUint16(14, modified.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, contentBytes.length, true);
  view.setUint32(24, contentBytes.length, true);
  view.setUint16(28, filenameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  bytes.set(filenameBytes, 46);

  return bytes;
}

function writeEndOfCentralDirectory({
  fileCount,
  centralDirectorySize,
  centralDirectoryOffset,
}) {
  const {
    bytes,
    view,
  } = createBuffer(22);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return bytes;
}

function concatBytes(parts) {
  const totalLength = parts.reduce(
    (sum, part) => sum + part.length,
    0
  );
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

export function buildZipBytes(files = []) {
  const modified = getDosDateParts();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const filenameBytes = textEncoder.encode(file.filename);
    const contentBytes = textEncoder.encode(file.content);
    const crc = getCrc32(contentBytes);
    const localHeader = writeLocalHeader({
      filenameBytes,
      contentBytes,
      crc,
      modified,
    });

    localParts.push(localHeader, contentBytes);
    centralParts.push(
      writeCentralDirectoryHeader({
        filenameBytes,
        contentBytes,
        crc,
        modified,
        localHeaderOffset: offset,
      })
    );
    offset += localHeader.length + contentBytes.length;
  });

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralParts.reduce(
    (sum, part) => sum + part.length,
    0
  );

  return concatBytes([
    ...localParts,
    ...centralParts,
    writeEndOfCentralDirectory({
      fileCount: files.length,
      centralDirectorySize,
      centralDirectoryOffset,
    }),
  ]);
}

export function buildExtractionExport(groups = []) {
  const files = buildCsvFiles(groups);

  if (files.length === 0) {
    return {
      filename: "documind-extraction.csv",
      mimeType: "text/csv;charset=utf-8",
      content: "",
      files,
    };
  }

  if (files.length === 1) {
    return {
      filename: files[0].filename,
      mimeType: "text/csv;charset=utf-8",
      content: files[0].content,
      files,
    };
  }

  return {
    filename: "documind-extraction.zip",
    mimeType: "application/zip",
    content: buildZipBytes(files),
    files,
  };
}
