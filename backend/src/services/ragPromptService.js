const defaultHistoryLimit = 6;
const defaultMaxChunkCharacters = 3500;
const defaultMaxQuestionCharacters = 2000;
const validRoles = new Set([
  "user",
  "assistant",
]);

const systemInstruction = [
  "You are DocuMind, a source-grounded document assistant.",
  "Answer the user's current question using the provided source chunks first.",
  "Cite sources with bracket notation like [1] or [2] for every factual claim that comes from the sources.",
  "If multiple sources support the same claim, cite each relevant source like [1][3].",
  "If the sources do not contain enough information to answer, say that the provided documents do not include enough information.",
  "Do not invent document names, page numbers, citations, quotes, or facts.",
  "Use recent conversation history only to understand follow-up references, not as a source of factual truth.",
  "If the user asks to rewrite, reformat, or put the previous answer in a paragraph, preserve the same document focus and answer from the retrieved sources.",
  "Keep the answer concise, clear, and directly focused on the user's question.",
  "Do not use markdown emphasis markers such as **bold** or *italic*; write clean plain text except for markdown tables when the user explicitly asks for a table.",
].join("\n");

function normalizeText(value, maxCharacters) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    maxCharacters &&
    text.length > maxCharacters
  ) {
    return `${text.slice(0, maxCharacters).trim()}...`;
  }

  return text;
}

function normalizeRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase();

  return validRoles.has(normalizedRole)
    ? normalizedRole
    : "user";
}

function normalizeConversationHistory(
  conversationHistory = [],
  historyLimit = defaultHistoryLimit
) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter((message) =>
      Boolean(
        normalizeText(
          message?.content ?? message?.text
        )
      )
    )
    .slice(-historyLimit)
    .map((message) => ({
      role: normalizeRole(message.role),
      content: normalizeText(
        message.content ?? message.text,
        2000
      ),
    }));
}

function normalizeSourceChunks(
  sourceChunks = [],
  maxChunkCharacters = defaultMaxChunkCharacters
) {
  if (!Array.isArray(sourceChunks)) {
    return [];
  }

  return sourceChunks
    .filter((chunk) =>
      Boolean(normalizeText(chunk?.text))
    )
    .map((chunk, index) => ({
      citationNumber: index + 1,
      chunkId: chunk.chunkId?.toString(),
      documentId: chunk.documentId?.toString(),
      documentName:
        normalizeText(chunk.documentName) ||
        "Untitled document",
      pageNumber: chunk.pageNumber ?? null,
      chunkIndex: chunk.chunkIndex ?? null,
      sectionHeader:
        normalizeText(chunk.sectionHeader) || "",
      score:
        typeof chunk.score === "number"
          ? chunk.score
          : null,
      text: normalizeText(
        chunk.text,
        maxChunkCharacters
      ),
    }));
}

function formatSourceMetadata(source) {
  const metadata = [
    `Document: ${source.documentName}`,
  ];

  if (source.pageNumber !== null) {
    metadata.push(`Page: ${source.pageNumber}`);
  }

  if (source.chunkIndex !== null) {
    metadata.push(`Chunk: ${source.chunkIndex}`);
  }

  if (source.sectionHeader) {
    metadata.push(
      `Section: ${source.sectionHeader}`
    );
  }

  return metadata.join(", ");
}

function formatSourceChunks(sources) {
  if (sources.length === 0) {
    return "No source chunks were retrieved.";
  }

  return sources
    .map(
      (source) =>
        `[${source.citationNumber}] ${formatSourceMetadata(
          source
        )}\n${source.text}`
    )
    .join("\n\n");
}

function formatConversationHistory(history) {
  if (history.length === 0) {
    return "No recent conversation history.";
  }

  return history
    .map(
      (message) =>
        `${message.role.toUpperCase()}: ${message.content}`
    )
    .join("\n");
}

export function buildRagPrompt({
  question,
  sourceChunks = [],
  conversationHistory = [],
  historyLimit = defaultHistoryLimit,
  maxChunkCharacters = defaultMaxChunkCharacters,
  maxQuestionCharacters = defaultMaxQuestionCharacters,
} = {}) {
  const normalizedQuestion = normalizeText(
    question,
    maxQuestionCharacters
  );

  if (!normalizedQuestion) {
    throw new Error("Question is required.");
  }

  const sources = normalizeSourceChunks(
    sourceChunks,
    maxChunkCharacters
  );
  const history = normalizeConversationHistory(
    conversationHistory,
    historyLimit
  );
  const userPrompt = [
    "Source chunks:",
    formatSourceChunks(sources),
    "",
    "Recent conversation history:",
    formatConversationHistory(history),
    "",
    "Current user question:",
    normalizedQuestion,
  ].join("\n");

  return {
    systemInstruction,
    userPrompt,
    question: normalizedQuestion,
    sources,
    conversationHistory: history,
  };
}

export function buildRagPromptText(options = {}) {
  const prompt = buildRagPrompt(options);

  return [
    "System instructions:",
    prompt.systemInstruction,
    "",
    prompt.userPrompt,
  ].join("\n");
}

const extractionSystemInstruction = [
  "You are DocuMind, a source-grounded structured extraction assistant.",
  "Extract only the fields requested by the user from the provided source chunks.",
  "Return valid JSON only. Do not wrap the JSON in markdown fences or add explanatory text.",
  "Use this exact compact JSON shape: {\"columns\":[\"field\",\"value\",\"type\",\"source\"],\"rows\":[[\"field\",\"value\",\"type\",\"source\"]]}.",
  "Each row must represent one extracted item supported by a source chunk.",
  "When multiple details belong to the same entity, combine them into one row instead of creating separate rows.",
  "The source value must cite the document and location in plain text, such as \"Contract.pdf, p. 2\" or \"Notes.txt, chunk 4\".",
  "Return at most 25 rows. Prefer the strongest, clearest matches when there are more than 25 matching items.",
  "Keep every cell concise. Do not include evidence, explanations, nested objects, or extra keys.",
  "If the provided sources do not contain matching items, return {\"columns\":[\"field\",\"value\",\"type\",\"source\"],\"rows\":[]}.",
  "Do not invent fields, values, documents, page numbers, chunk indexes, or facts.",
].join("\n");

export function buildStructuredExtractionPrompt({
  prompt,
  sourceChunks = [],
  maxChunkCharacters = defaultMaxChunkCharacters,
  maxPromptCharacters = defaultMaxQuestionCharacters,
} = {}) {
  const normalizedPrompt = normalizeText(
    prompt,
    maxPromptCharacters
  );

  if (!normalizedPrompt) {
    throw new Error("Extraction prompt is required.");
  }

  const sources = normalizeSourceChunks(
    sourceChunks,
    maxChunkCharacters
  );
  const userPrompt = [
    "Extraction request:",
    normalizedPrompt,
    "",
    "Source chunks:",
    formatSourceChunks(sources),
  ].join("\n");

  return {
    systemInstruction: extractionSystemInstruction,
    userPrompt,
    prompt: normalizedPrompt,
    sources,
  };
}
