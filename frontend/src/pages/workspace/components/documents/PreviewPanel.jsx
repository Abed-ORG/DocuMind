import { useRef } from "react";
import {
  AlertCircle,
  FileText,
  X,
} from "lucide-react";

import { PreviewSkeleton } from "../../../../components/Skeleton";
import { statusLabels } from "../../data/workspaceData";

const highlightStopWords = new Set([
  "about",
  "across",
  "after",
  "also",
  "and",
  "are",
  "based",
  "been",
  "before",
  "between",
  "can",
  "could",
  "does",
  "for",
  "from",
  "has",
  "have",
  "how",
  "including",
  "into",
  "its",
  "may",
  "not",
  "our",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "that",
  "those",
  "through",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "you",
  "your",
]);

const citedTextHeadings = [
  "Introduction",
  "Objective",
  "Functional Requirements",
  "Test Matrix",
  "Key facts",
  "Curiosity and Learning",
  "Curiosity and Innovation",
  "Curiosity in Society",
  "The Risks of Losing Curiosity",
  "Risks and Consequences",
  "Conclusion",
  "Conclusions",
];

function escapeRegExp(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getSignificantTerms(value) {
  return (
    String(value ?? "")
      .toLowerCase()
      .match(/[a-z0-9]{4,}/g)
      ?.filter(
        (word) => !highlightStopWords.has(word)
      )
      .slice(0, 16) ?? []
  );
}

function getTextHighlightParts(text, highlightText) {
  const sourceText = String(text ?? "");
  const query = String(highlightText ?? "").trim();

  if (!sourceText || !query) {
    return [
      {
        text: sourceText,
        isHighlighted: false,
      },
    ];
  }

  const exactIndex = sourceText
    .toLowerCase()
    .indexOf(query.toLowerCase());

  if (exactIndex >= 0) {
    return [
      {
        text: sourceText.slice(0, exactIndex),
        isHighlighted: false,
      },
      {
        text: sourceText.slice(
          exactIndex,
          exactIndex + query.length
        ),
        isHighlighted: true,
      },
      {
        text: sourceText.slice(exactIndex + query.length),
        isHighlighted: false,
      },
    ].filter((part) => part.text);
  }

  const terms = getSignificantTerms(query);

  if (terms.length === 0) {
    return [
      {
        text: sourceText,
        isHighlighted: false,
      },
    ];
  }

  const pattern = new RegExp(
    `\\b(${terms.map(escapeRegExp).join("|")})\\b`,
    "gi"
  );
  const parts = [];
  let lastIndex = 0;

  sourceText.replace(pattern, (match, _term, offset) => {
    if (offset > lastIndex) {
      parts.push({
        text: sourceText.slice(lastIndex, offset),
        isHighlighted: false,
      });
    }

    parts.push({
      text: match,
      isHighlighted: true,
    });
    lastIndex = offset + match.length;

    return match;
  });

  if (lastIndex < sourceText.length) {
    parts.push({
      text: sourceText.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return parts.length > 0
    ? parts
    : [
        {
          text: sourceText,
          isHighlighted: false,
        },
      ];
}

function HighlightedText({
  text,
  highlightText,
}) {
  return getTextHighlightParts(
    text,
    highlightText
  ).map((part, index) =>
    part.isHighlighted ? (
      <mark key={index}>{part.text}</mark>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}

function splitCitedTextBlocks(text) {
  let sourceText = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
  const pageMatch = sourceText.match(/^(Page\s+\d+)\s+/i);
  let pageLabel = "";
  let title = "";

  if (pageMatch) {
    pageLabel = pageMatch[1];
    sourceText = sourceText
      .slice(pageMatch[0].length)
      .trim();
  }

  const headingPattern = new RegExp(
    `\\b(${citedTextHeadings
      .map(escapeRegExp)
      .join("|")})\\b`,
    "i"
  );
  const firstHeadingMatch = sourceText.match(headingPattern);

  if (firstHeadingMatch?.index > 0) {
    title = sourceText
      .slice(0, firstHeadingMatch.index)
      .trim();
    sourceText = sourceText
      .slice(firstHeadingMatch.index)
      .trim();
  }

  citedTextHeadings.forEach((heading) => {
    const pattern = new RegExp(
      `\\b(${escapeRegExp(heading)})(?=\\s+[A-Z0-9])`,
      "g"
    );

    sourceText = sourceText.replace(
      pattern,
      "\n\n$1\n"
    );
  });

  const lines = sourceText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let currentBlock = null;

  lines.forEach((line) => {
    if (citedTextHeadings.includes(line)) {
      currentBlock = {
        heading: line,
        paragraphs: [],
      };
      blocks.push(currentBlock);
      return;
    }

    if (!currentBlock) {
      currentBlock = {
        heading: "",
        paragraphs: [],
      };
      blocks.push(currentBlock);
    }

    currentBlock.paragraphs.push(line);
  });

  return {
    pageLabel,
    title,
    blocks,
  };
}

function FormattedCitedText({
  text,
  highlightText,
}) {
  const citedText = splitCitedTextBlocks(text);

  return (
    <div className="formatted-cited-text">
      {(citedText.pageLabel || citedText.title) && (
        <div className="cited-text-heading-group">
          {citedText.pageLabel && (
            <span className="badge neutral">
              {citedText.pageLabel}
            </span>
          )}
          {citedText.title && (
            <h4>{citedText.title}</h4>
          )}
        </div>
      )}

      {citedText.blocks.map((block, blockIndex) => (
        <section
          className="cited-text-block"
          key={`${block.heading}-${blockIndex}`}
        >
          {block.heading && <h5>{block.heading}</h5>}
          {block.paragraphs.map((paragraph, index) => (
            <p key={`${blockIndex}-${index}`}>
              <HighlightedText
                text={paragraph}
                highlightText={highlightText}
              />
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function getPdfSearchText(text) {
  const citedText = splitCitedTextBlocks(text);
  const firstParagraph = citedText.blocks
    .flatMap((block) => block.paragraphs)
    .find((paragraph) => paragraph.length > 20);

  return String(firstParagraph ?? citedText.title ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function buildFilePreviewUrl({
  fileUrl,
  pageNumber,
  searchText,
}) {
  if (!fileUrl) {
    return "";
  }

  const fragmentParts = [];

  if (pageNumber) {
    fragmentParts.push(`page=${pageNumber}`);
  }

  if (searchText) {
    fragmentParts.push(
      `search=${encodeURIComponent(searchText)}`
    );
  }

  return fragmentParts.length > 0
    ? `${fileUrl}#${fragmentParts.join("&")}`
    : fileUrl;
}

function shouldHighlightCell(value, highlightText) {
  const terms = getSignificantTerms(highlightText);
  const normalizedValue = String(value ?? "")
    .toLowerCase()
    .trim();

  return terms.some((term) =>
    normalizedValue.includes(term)
  );
}

function getHighlightedHtml(html, highlightText) {
  const terms = getSignificantTerms(highlightText);

  if (
    !html ||
    terms.length === 0 ||
    typeof DOMParser === "undefined" ||
    typeof document === "undefined" ||
    typeof NodeFilter === "undefined"
  ) {
    return html;
  }

  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(
    `<body>${html}</body>`,
    "text/html"
  );
  const pattern = new RegExp(
    `\\b(${terms.map(escapeRegExp).join("|")})\\b`,
    "gi"
  );
  const textNodes = [];
  const walker = parsedDocument.createTreeWalker(
    parsedDocument.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parentTag =
          node.parentElement?.tagName?.toLowerCase();

        if (
          !node.nodeValue?.trim() ||
          ["script", "style", "mark"].includes(
            parentTag
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        pattern.lastIndex = 0;
        return pattern.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const fragment =
      parsedDocument.createDocumentFragment();
    const text = node.nodeValue ?? "";
    let lastIndex = 0;

    pattern.lastIndex = 0;
    text.replace(pattern, (match, _term, offset) => {
      if (offset > lastIndex) {
        fragment.append(
          parsedDocument.createTextNode(
            text.slice(lastIndex, offset)
          )
        );
      }

      const mark =
        parsedDocument.createElement("mark");
      mark.textContent = match;
      fragment.append(mark);
      lastIndex = offset + match.length;

      return match;
    });

    if (lastIndex < text.length) {
      fragment.append(
        parsedDocument.createTextNode(
          text.slice(lastIndex)
        )
      );
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  return parsedDocument.body.innerHTML;
}

function CsvPreviewTable({
  table,
  highlightText = "",
  hideSummary = false,
}) {
  const columns = Array.isArray(table?.columns)
    ? table.columns
    : [];
  const rows = Array.isArray(table?.rows)
    ? table.rows
    : [];
  const highlightedColumnIndexes = new Set(
    rows.flatMap((row) =>
      Array.isArray(row.highlightedColumnIndexes)
        ? row.highlightedColumnIndexes
        : []
    )
  );
  function getSpreadsheetColumnLabel(index) {
    let value = index + 1;
    let label = "";

    while (value > 0) {
      const remainder = (value - 1) % 26;

      label =
        String.fromCharCode(65 + remainder) + label;
      value = Math.floor((value - 1) / 26);
    }

    return label;
  }

  return (
    <div className="csv-preview">
      {!hideSummary && (
        <div className="csv-preview-summary">
          <span>{rows.length} rows shown</span>
          <span>{columns.length} columns shown</span>
          {table?.isTruncated && (
            <span className="csv-preview-limited">
              Preview limited
            </span>
          )}
        </div>
      )}

      <div className="csv-table-scroll">
        <table className="csv-preview-table">
          <thead>
            <tr className="csv-column-letters">
              <th className="csv-row-number csv-corner-cell" />
              {columns.map((column, index) => (
                <th key={`column-letter-${column}-${index}`}>
                  {getSpreadsheetColumnLabel(index)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="csv-row-number">#</th>
              {columns.map((column, index) => (
                <th
                  className={
                    hideSummary &&
                    highlightedColumnIndexes.has(index)
                      ? "is-citation-highlight"
                      : undefined
                  }
                  key={`${column}-${index}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className={
                  row.isCitationHighlighted
                    ? "is-citation-highlight"
                    : undefined
                }
                key={row.rowNumber}
              >
                <td className="csv-row-number">
                  {row.rowNumber}
                </td>
                {columns.map((_, index) => {
                  const value = row.cells?.[index] ?? "";

                  return (
                    <td
                      className={
                        row.highlightedColumnIndexes?.includes(
                          index
                        ) ||
                        (!row.isCitationHighlighted &&
                          shouldHighlightCell(
                            value,
                            highlightText
                          ))
                          ? "is-citation-highlight"
                          : undefined
                      }
                      key={`${row.rowNumber}-${index}`}
                      title={value}
                    >
                      {value || "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewPanel({
  document,
  error,
  fileUrl = "",
  html = "",
  isLoading,
  pages,
  previewType = "text",
  table,
  citation,
  citationHighlightText = "",
  initialPageNumber,
  onClose,
}) {
  const previewContentRef = useRef(null);
  const htmlFrameRef = useRef(null);
  const pdfFrameRef = useRef(null);

  if (!document) {
    return null;
  }

  const previewPages = Array.isArray(pages)
    ? pages
    : [];
  const hasTablePreview =
    previewType === "table" &&
    Array.isArray(table?.columns) &&
    table.columns.length > 0;
  const isFilePreview = previewType === "file";
  const isCitationPreview = Boolean(citation);
  const hasFilePreview =
    isFilePreview && Boolean(fileUrl);
  const hasHtmlPreview =
    previewType === "html" && Boolean(html);
  const filePreviewUrl = hasFilePreview
    ? buildFilePreviewUrl({
        fileUrl,
        pageNumber: initialPageNumber,
        searchText: isCitationPreview
          ? getPdfSearchText(citationHighlightText)
          : "",
      })
    : "";
  const previewPanelClassName = hasFilePreview
    ? `preview-panel preview-panel-file${
        isCitationPreview
          ? " preview-panel-citation-file"
          : ""
      }`
    : "preview-panel";
  const highlightedHtml = hasHtmlPreview
    ? getHighlightedHtml(html, citationHighlightText)
    : "";
  const htmlPreviewDocument = hasHtmlPreview
    ? `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            :root { color-scheme: light; }
            body {
              margin: 0;
              padding: 44px;
              color: #111827;
              background: #ffffff;
              font-family: Georgia, "Times New Roman", serif;
              font-size: 16px;
              line-height: 1.65;
            }
            h1, h2, h3, h4, h5, h6 {
              margin: 1.1em 0 0.45em;
              color: #111827;
              line-height: 1.2;
            }
            h1 { font-size: 2rem; }
            h2 { font-size: 1.55rem; }
            h3 { font-size: 1.25rem; }
            p { margin: 0 0 0.85em; }
            table {
              width: 100%;
              margin: 1em 0;
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 0.95rem;
            }
            th, td {
              padding: 9px 10px;
              border: 1px solid #d1d5db;
              text-align: left;
              vertical-align: top;
            }
            th {
              color: #111827;
              background: #f3f4f6;
              font-weight: 700;
            }
            img { max-width: 100%; height: auto; }
            mark {
              padding: 2px 4px;
              border-radius: 5px;
              color: #713f12;
              background: #fde68a;
              box-decoration-break: clone;
              -webkit-box-decoration-break: clone;
            }
          </style>
        </head>
        <body>${highlightedHtml}</body>
      </html>`
    : "";

  function takeMeThere() {
    if (hasFilePreview && pdfFrameRef.current) {
      pdfFrameRef.current.src = "";
      window.requestAnimationFrame(() => {
        if (pdfFrameRef.current) {
          pdfFrameRef.current.src = filePreviewUrl;
          pdfFrameRef.current.focus();
        }
      });
      return;
    }

    if (hasHtmlPreview) {
      const target =
        htmlFrameRef.current?.contentDocument?.querySelector(
          "mark"
        );

      target?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const target =
      previewContentRef.current?.querySelector(
        "tbody .is-citation-highlight, .preview-text-block mark, mark, .is-citation-highlight"
      );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }

  function handleHtmlFrameLoad() {
    if (!isCitationPreview) {
      return;
    }

    htmlFrameRef.current?.contentDocument
      ?.querySelector("mark")
      ?.scrollIntoView({
        block: "center",
      });
  }

  return (
    <div
      className="preview-modal-backdrop"
      role="presentation"
    >
      <section
        className={previewPanelClassName}
        aria-label="Document preview"
        aria-modal="true"
        role="dialog"
      >
        {isFilePreview ? (
          <button
            className="icon-button preview-file-close"
            type="button"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        ) : (
          <header className="preview-header">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>{document.name}</h2>
              <div className="preview-meta">
                <span className="badge neutral">
                  {document.format}
                </span>
                <span
                  className={`badge status-${document.status}`}
                >
                  {statusLabels[document.status] ??
                    document.status}
                </span>
                {citation?.label && (
                  <span className="badge neutral">
                    Citation {citation.label}
                  </span>
                )}
              </div>
            </div>
            <div className="preview-header-actions">
              {isCitationPreview && (
                <button
                  className="secondary-action"
                  type="button"
                  onClick={takeMeThere}
                >
                  Take me there
                </button>
              )}
              <button
                className="icon-button"
                type="button"
                aria-label="Close preview"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
          </header>
        )}

        <div className="preview-content" ref={previewContentRef}>
          {isLoading ? (
            <PreviewSkeleton />
          ) : error ? (
            <div className="preview-state preview-error">
              <AlertCircle size={34} />
              <h3>Unable to load preview</h3>
              <p>{error}</p>
            </div>
          ) : hasFilePreview ? (
            isCitationPreview ? (
              <div className="citation-file-split">
                <div className="citation-file-document">
                  <iframe
                    ref={pdfFrameRef}
                    className="preview-file-frame"
                    title={`${document.name} preview`}
                    src={filePreviewUrl}
                  />
                </div>
                <aside className="citation-file-used-text">
                  <header>
                    <h3>Cited Text</h3>
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={takeMeThere}
                    >
                      Take me there
                    </button>
                  </header>
                  <FormattedCitedText
                      text={citationHighlightText}
                      highlightText={citationHighlightText}
                  />
                </aside>
              </div>
            ) : (
              <iframe
                className="preview-file-frame"
                title={`${document.name} preview`}
                src={filePreviewUrl}
              />
            )
          ) : hasHtmlPreview ? (
            <iframe
              ref={htmlFrameRef}
              className="preview-html-frame"
              title={`${document.name} preview`}
              onLoad={handleHtmlFrameLoad}
              sandbox=""
              srcDoc={htmlPreviewDocument}
            />
          ) : hasTablePreview ? (
            <CsvPreviewTable
              table={table}
              highlightText={citationHighlightText}
              hideSummary={isCitationPreview}
            />
          ) : previewPages.length === 0 ? (
            <div className="preview-state">
              <FileText size={34} />
              <h3>No preview available</h3>
              <p>
                This document does not have extracted text
                available yet.
              </p>
            </div>
          ) : (
            <>
              {previewPages.map((page, index) => (
                <section
                  className="preview-page"
                  key={`${page.pageNumber}-${index}`}
                >
                  <div className="page-separator">
                    Page {page.pageNumber}
                  </div>
                  <pre className="preview-text-block">
                    <HighlightedText
                      text={page.text}
                      highlightText={
                        citationHighlightText
                      }
                    />
                  </pre>
                  {page.isTruncated && (
                    <p className="preview-truncated-note">
                      Preview truncated to keep this panel fast.
                    </p>
                  )}
                </section>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default PreviewPanel;
