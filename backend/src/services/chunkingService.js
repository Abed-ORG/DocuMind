import Chunk from "../models/Chunk.js";

export const DEFAULT_CHUNK_TOKEN_LIMIT = 600;
export const DEFAULT_CHUNK_TOKEN_OVERLAP = 100;

const tokenPattern = /\S+/g;
const headingNumberPattern =
  /^(\d+(\.\d+)*|[A-Z])[\s.)-]+[A-Za-z]/;
const markdownHeadingPattern = /^#{1,6}\s+\S/;
const terminalSentencePunctuationPattern = /[.!?;:]$/;

function assertValidChunkOptions({
  maxTokens,
  overlapTokens,
}) {
  if (
    !Number.isInteger(maxTokens) ||
    maxTokens < 1
  ) {
    throw new Error(
      "Chunk maxTokens must be a positive integer."
    );
  }

  if (
    !Number.isInteger(overlapTokens) ||
    overlapTokens < 0
  ) {
    throw new Error(
      "Chunk overlapTokens must be a non-negative integer."
    );
  }

  if (overlapTokens >= maxTokens) {
    throw new Error(
      "Chunk overlapTokens must be smaller than maxTokens."
    );
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages
    .map((page, index) => ({
      pageNumber:
        Number.isInteger(page?.pageNumber) &&
        page.pageNumber > 0
          ? page.pageNumber
          : index + 1,
      text: normalizeText(page?.text),
    }))
    .filter((page) => page.text.trim().length > 0);
}

function shouldInsertPageSeparator(source) {
  return source.length > 0 && !source.endsWith("\n");
}

function createSourceText(pages) {
  let text = "";
  const pageRanges = [];

  pages.forEach((page) => {
    if (shouldInsertPageSeparator(text)) {
      text += "\n\n";
    }

    const start = text.length;
    text += page.text;
    const end = text.length;

    pageRanges.push({
      pageNumber: page.pageNumber,
      start,
      end,
    });
  });

  return {
    text,
    pageRanges,
  };
}

function getPageNumberForOffset(pageRanges, offset) {
  const range = pageRanges.find(
    (pageRange) =>
      offset >= pageRange.start &&
      offset <= pageRange.end
  );

  return range?.pageNumber ?? 1;
}

function tokenize(text, pageRanges) {
  return Array.from(text.matchAll(tokenPattern)).map(
    (match) => ({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
      pageNumber: getPageNumberForOffset(
        pageRanges,
        match.index
      ),
    })
  );
}

function isTitleCaseCandidate(value) {
  const words = value
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0 || words.length > 14) {
    return false;
  }

  const titleishWords = words.filter((word) =>
    /^[A-Z0-9][A-Za-z0-9'&/-]*$/.test(word)
  );

  return titleishWords.length / words.length >= 0.7;
}

function isLikelySectionHeader(line) {
  const value = line
    .replace(/^#{1,6}\s+/, "")
    .trim();

  if (value.length < 3 || value.length > 140) {
    return false;
  }

  if (markdownHeadingPattern.test(line)) {
    return true;
  }

  if (headingNumberPattern.test(value)) {
    return true;
  }

  if (
    value === value.toUpperCase() &&
    /[A-Z]/.test(value) &&
    value.length <= 100
  ) {
    return true;
  }

  return (
    isTitleCaseCandidate(value) &&
    !terminalSentencePunctuationPattern.test(value)
  );
}

function detectSectionHeaders(text) {
  const headers = [];
  let offset = 0;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const leadingWhitespace =
      line.length - line.trimStart().length;

    if (isLikelySectionHeader(trimmed)) {
      headers.push({
        text: trimmed.replace(/^#{1,6}\s+/, ""),
        start: offset + leadingWhitespace,
      });
    }

    offset += line.length + 1;
  }

  return headers;
}

function getSectionHeaderForOffset(headers, offset) {
  let currentHeader = "";

  for (const header of headers) {
    if (header.start > offset) {
      break;
    }

    currentHeader = header.text;
  }

  return currentHeader;
}

function trimChunkSlice({
  text,
  start,
  end,
}) {
  const rawText = text.slice(start, end);
  const leadingWhitespace =
    rawText.match(/^\s*/)?.[0].length ?? 0;
  const trailingWhitespace =
    rawText.match(/\s*$/)?.[0].length ?? 0;
  const charStart = start + leadingWhitespace;
  const charEnd = end - trailingWhitespace;

  return {
    text: text.slice(charStart, charEnd),
    charStart,
    charEnd,
  };
}

export function buildChunksFromPages({
  documentId,
  workspaceId,
  pages,
  maxTokens = DEFAULT_CHUNK_TOKEN_LIMIT,
  overlapTokens = DEFAULT_CHUNK_TOKEN_OVERLAP,
}) {
  assertValidChunkOptions({
    maxTokens,
    overlapTokens,
  });

  const normalizedPages = normalizePages(pages);

  if (normalizedPages.length === 0) {
    return [];
  }

  const {
    text,
    pageRanges,
  } = createSourceText(normalizedPages);
  const tokens = tokenize(text, pageRanges);

  if (tokens.length === 0) {
    return [];
  }

  const sectionHeaders = detectSectionHeaders(text);
  const chunks = [];
  let tokenStart = 0;

  while (tokenStart < tokens.length) {
    const tokenEnd = Math.min(
      tokenStart + maxTokens,
      tokens.length
    );
    const firstToken = tokens[tokenStart];
    const lastToken = tokens[tokenEnd - 1];
    const trimmedChunk = trimChunkSlice({
      text,
      start: firstToken.start,
      end: lastToken.end,
    });

    if (trimmedChunk.text.length > 0) {
      chunks.push({
        documentId,
        workspaceId,
        text: trimmedChunk.text,
        chunkIndex: chunks.length,
        pageNumber: firstToken.pageNumber,
        sectionHeader: getSectionHeaderForOffset(
          sectionHeaders,
          trimmedChunk.charStart
        ),
        charStart: trimmedChunk.charStart,
        charEnd: trimmedChunk.charEnd,
      });
    }

    if (tokenEnd === tokens.length) {
      break;
    }

    tokenStart = tokenEnd - overlapTokens;
  }

  return chunks;
}

export async function replaceDocumentChunks({
  documentId,
  workspaceId,
  pages,
  maxTokens = DEFAULT_CHUNK_TOKEN_LIMIT,
  overlapTokens = DEFAULT_CHUNK_TOKEN_OVERLAP,
}) {
  const chunks = buildChunksFromPages({
    documentId,
    workspaceId,
    pages,
    maxTokens,
    overlapTokens,
  });

  await Chunk.deleteMany({
    documentId,
  });

  if (chunks.length === 0) {
    return [];
  }

  return Chunk.insertMany(chunks);
}
