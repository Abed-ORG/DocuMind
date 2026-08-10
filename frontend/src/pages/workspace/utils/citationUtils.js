export function getCitationTitle(citation) {
  const parts = [];
  const label =
    citation.label ?? citation.citationNumber ?? "";

  if (citation.documentName) {
    parts.push(citation.documentName);
  }

  if (citation.pageNumber) {
    parts.push(`p. ${citation.pageNumber}`);
  }

  if (citation.sectionHeader) {
    parts.push(citation.sectionHeader);
  }

  return parts.join(", ") || `Source ${label}`;
}

export function getShortDocumentName(documentName) {
  const normalizedName = String(documentName ?? "")
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1);

  if (!normalizedName) {
    return "";
  }

  if (normalizedName.length <= 34) {
    return normalizedName;
  }

  const extensionMatch = normalizedName.match(
    /(\.[a-z0-9]+)$/i
  );
  const extension = extensionMatch?.[1] ?? "";
  const baseName = extension
    ? normalizedName.slice(0, -extension.length)
    : normalizedName;

  return `${baseName.slice(0, 24).trim()}...${extension}`;
}

export function getCitationChipLabel(citation) {
  const label =
    citation.label ?? citation.citationNumber ?? "";
  const sourceLabel =
    getShortDocumentName(citation.documentName) ||
    `Source ${label}`;
  const pageLabel = citation.pageNumber
    ? `p. ${citation.pageNumber}`
    : "page unknown";

  return `${sourceLabel}, ${pageLabel}`;
}

export function getDocumentFormatFromName(documentName) {
  const extension = String(documentName ?? "")
    .split(".")
    .pop()
    ?.toUpperCase();

  if (["PDF", "DOCX", "TXT", "CSV"].includes(extension)) {
    return extension;
  }

  return "TXT";
}

function normalizeCsvCell(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCsvRow(cells) {
  return cells.map(normalizeCsvCell).join("\u001f").toLowerCase();
}

function normalizeSearchText(value) {
  return normalizeCsvCell(value).toLowerCase();
}

function isLikelyUsefulCsvCell(value) {
  const cell = normalizeCsvCell(value);

  return cell.length >= 2 && !/^(na|n\/a|null|none)$/i.test(cell);
}

function parseCsvRows(text) {
  const source = String(text ?? "").replace(
    /\r\n/g,
    "\n"
  );
  const rows = [];
  let row = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === "\"") {
      if (isQuoted && source[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === "," && !isQuoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (character === "\n" && !isQuoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows.filter((cells) => cells.length > 1);
}

function isNumericCsvCell(value) {
  return /^[-+]?\d[\d,.]*%?$/.test(
    normalizeCsvCell(value)
  );
}

export function createCsvPreviewTableFromText({
  csvText,
  citationText,
}) {
  const rows = parseCsvRows(csvText);

  if (rows.length === 0) {
    return {
      columns: [],
      rows: [],
      isTruncated: false,
    };
  }

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  const citationRows = parseCsvRows(citationText);
  const normalizedHeaderRow = normalizeCsvRow(headerRow);
  const citationCandidateRows =
    normalizeCsvRow(citationRows[0] ?? []) ===
    normalizedHeaderRow
      ? citationRows.slice(1)
      : citationRows;
  const citationRowKeys = new Set(
    citationCandidateRows.map(normalizeCsvRow)
  );
  const normalizedCitationText = normalizeSearchText(
    citationText
  );
  const columnCount = Math.max(
    ...rows.map((row) => row.length)
  );
  const columns = Array.from(
    {
      length: columnCount,
    },
    (_, index) =>
      normalizeCsvCell(headerRow[index]) ||
      `Column ${index + 1}`
  );

  return {
    columns,
    rows: bodyRows.map((row, index) => ({
      rowNumber: index + 2,
      cells: columns.map(
        (_, columnIndex) =>
          normalizeCsvCell(row[columnIndex])
      ),
      isCitationHighlighted: (() => {
        const normalizedRow = normalizeCsvRow(row);

        if (citationRowKeys.has(normalizedRow)) {
          return true;
        }

        const meaningfulCells = row
          .map(normalizeCsvCell)
          .filter(isLikelyUsefulCsvCell);
        const matchedCells = meaningfulCells.filter((cell) =>
          normalizedCitationText.includes(
            cell.toLowerCase()
          )
        );
        const contentCells = meaningfulCells.filter(
          (cell) => !isNumericCsvCell(cell)
        );
        const matchedContentCells = contentCells.filter(
          (cell) =>
            normalizedCitationText.includes(
              cell.toLowerCase()
            )
        );

        return (
          meaningfulCells.length > 0 &&
          (matchedCells.length >=
            Math.min(2, meaningfulCells.length) ||
            matchedContentCells.length >= 1)
        );
      })(),
      highlightedColumnIndexes: columns
        .map((_, columnIndex) => columnIndex)
        .filter((columnIndex) => {
          const header = columns[columnIndex];
          const value = normalizeCsvCell(row[columnIndex]);

          return (
            isLikelyUsefulCsvCell(value) &&
            normalizedCitationText.includes(
              value.toLowerCase()
            ) &&
            (isLikelyUsefulCsvCell(header) ||
              !isNumericCsvCell(value))
          );
        }),
    })),
    isTruncated: false,
  };
}

export function getCitationEvidenceText(citation) {
  return [
    citation?.text,
    citation?.answerText,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}
