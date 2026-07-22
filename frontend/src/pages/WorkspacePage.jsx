import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import {
  AlertCircle,
  BarChart3,
  Bot,
  ChevronDown,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  PieChart,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Settings,
  Table2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import documindHero from "../assets/documind-hero.png";
import { useAuth } from "../context/AuthContext";
import {
  getWorkspace as getWorkspaceRequest,
  uploadDocument,
} from "../services/api";
import "./WorkspacePages.css";

const defaultWorkspaceColor = "#4F46E5";

const navItems = [
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
  },
  {
    key: "chat",
    label: "Chat",
    icon: MessageSquareText,
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
  },
];

function getInitials(user) {
  const first = user?.firstName?.[0] ?? "";
  const last = user?.lastName?.[0] ?? "";

  return `${first}${last}` || "DM";
}

const initialDocuments = [
  {
    id: "market-outlook",
    name: "2026 Market Outlook.pdf",
    format: "PDF",
    pages: 42,
    size: "8.4 MB",
    uploadedAt: "Jul 17, 2026",
    status: "ready",
    preview:
      "The report describes software buying cycles, budget expansion in AI search, and new compliance expectations for source-grounded answers.\n\n--- Page 2 ---\nEnterprise buyers increasingly require retrieval transparency and an audit trail for AI-generated answers.\n\n--- Page 3 ---\nNorth America remains the largest segment, while regulated industries show the fastest growth in document intelligence tooling.",
  },
  {
    id: "vendor-matrix",
    name: "Vendor Capability Matrix.xlsx",
    format: "CSV",
    pages: 12,
    size: "1.7 MB",
    uploadedAt: "Jul 16, 2026",
    status: "processing",
    preview:
      "Capability categories include ingestion, OCR accuracy, citation quality, structured extraction, and admin controls.\n\n--- Page 2 ---\nVendors with traceable answer provenance received higher evaluation scores.",
  },
  {
    id: "interview-notes",
    name: "Customer Interview Notes.docx",
    format: "DOCX",
    pages: 19,
    size: "2.2 MB",
    uploadedAt: "Jul 13, 2026",
    status: "ready",
    preview:
      "Interviewees emphasized trust, speed, and the ability to compare related documents without exporting files.\n\n--- Page 2 ---\nRepeated themes: faster evidence review, source highlighting, and easy summaries for executives.",
  },
  {
    id: "legacy-policy",
    name: "Legacy Policy Dump.txt",
    format: "TXT",
    pages: 86,
    size: "4.9 MB",
    uploadedAt: "Jul 11, 2026",
    status: "failed",
    preview:
      "Import failed before text extraction completed. Retry with a UTF-8 encoded text file.",
  },
  {
    id: "quarterly-model",
    name: "Quarterly Revenue Model.csv",
    format: "CSV",
    pages: 7,
    size: "940 KB",
    uploadedAt: "Jul 10, 2026",
    status: "uploading",
    preview:
      "Rows include quarter, region, revenue, gross margin, and customer cohort.",
  },
];

const statusLabels = {
  uploaded: "Uploaded",
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUploadedAt(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function mapUploadedDocument(document) {
  return {
    id: document.id,
    name: document.originalName,
    format: document.format,
    pages: document.pageCount ?? 0,
    size: formatFileSize(document.fileSize),
    uploadedAt: formatUploadedAt(document.createdAt),
    status: document.status ?? "uploaded",
    preview:
      "Document uploaded successfully. Text extraction and preview generation will run in a later processing step.",
  };
}

const summaryLevels = [
  {
    key: "oneLiner",
    label: "One-liner",
  },
  {
    key: "executive",
    label: "Executive",
  },
  {
    key: "detailed",
    label: "Detailed",
  },
];

const summaryCopy = {
  oneLiner:
    "The document shows rising demand for cited AI answers in regulated document workflows.",
  executive:
    "The document argues that document intelligence tools are moving from simple search toward source-grounded AI workspaces. The strongest demand comes from teams that need answers, summaries, comparisons, and structured extraction while preserving citation traceability.",
  detailed:
    "The document frames document intelligence as an operational layer for high-volume review work. It highlights a shift from unmanaged file search to workspace-based analysis, then connects that shift to buyer requirements around auditability, citations, extraction quality, and cross-document comparison. The strongest adoption signals come from legal, finance, policy, and research teams that need evidence they can inspect.",
};

const extractionRows = [
  {
    field: "Renewal date",
    value: "September 30, 2026",
    type: "Date",
    source: "Market Outlook, p.4",
  },
  {
    field: "Projected spend",
    value: "$1.8M",
    type: "Dollar amount",
    source: "Revenue Model, row 18",
  },
  {
    field: "Implementation window",
    value: "45 days",
    type: "Duration",
    source: "Vendor Matrix, p.2",
  },
  {
    field: "Risk threshold",
    value: "$250,000",
    type: "Dollar amount",
    source: "Interview Notes, p.8",
  },
];

const initialConversations = [
  {
    id: "conv-market",
    title: "Market growth risks",
    timestamp: "12 min ago",
    messages: [
      {
        id: "m1",
        role: "user",
        text: "Where does the report mention adoption risk?",
      },
      {
        id: "m2",
        role: "ai",
        text: "Adoption risk appears in the procurement section. The report says teams slow down when AI answers cannot be tied to reviewed source passages.",
        citations: [
          {
            id: "c1",
            label: "2026 Market Outlook.pdf, p.3",
            source:
              "Enterprise buyers increasingly require retrieval transparency and an audit trail for AI-generated answers.",
          },
        ],
      },
    ],
  },
  {
    id: "conv-vendors",
    title: "Vendor scoring",
    timestamp: "Yesterday",
    messages: [
      {
        id: "m3",
        role: "ai",
        text: "Vendors with stronger citation traceability and extraction controls scored higher in the evaluation matrix.",
        citations: [
          {
            id: "c2",
            label: "Vendor Capability Matrix.xlsx, p.2",
            source:
              "Vendors with traceable answer provenance received higher evaluation scores.",
          },
        ],
      },
    ],
  },
];

function getFormatIcon(format) {
  if (format === "CSV") {
    return FileSpreadsheet;
  }

  if (format === "TXT") {
    return File;
  }

  return FileText;
}

function PreviewPanel({ document, onClose }) {
  if (!document) {
    return null;
  }

  return (
    <aside className="preview-panel" aria-label="Document preview">
      <header className="preview-header">
        <div>
          <p className="eyebrow">Preview</p>
          <h2>{document.name}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close preview"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>

      <div className="preview-content">
        {document.preview.split("\n").map((line) =>
          line.startsWith("---") ? (
            <div className="page-separator" key={line}>
              {line}
            </div>
          ) : (
            <p key={line}>{line}</p>
          )
        )}
      </div>
    </aside>
  );
}

function SummaryPanel({
  summaryState,
  document,
  onLevelChange,
  onRegenerate,
}) {
  if (!summaryState || !document) {
    return null;
  }

  return (
    <section className="summary-panel">
      <header>
        <div>
          <p className="eyebrow">Summary</p>
          <h3>{document.name}</h3>
        </div>
        {summaryState.cached && (
          <span className="badge success">Cached</span>
        )}
      </header>

      <div className="summary-levels" role="group">
        {summaryLevels.map((level) => (
          <button
            key={level.key}
            className={
              summaryState.level === level.key
                ? "summary-level is-active"
                : "summary-level"
            }
            type="button"
            onClick={() => onLevelChange(level.key)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="summary-result">
        {summaryState.isLoading ? (
          <div className="loading-row">
            <Loader2 className="spinner" size={18} />
            Generating summary
          </div>
        ) : (
          <p>{summaryState.text}</p>
        )}
      </div>

      <button
        className="secondary-action"
        type="button"
        onClick={onRegenerate}
      >
        <RefreshCw size={16} />
        Regenerate
      </button>
    </section>
  );
}

function getActiveSection(pathname) {
  const section = pathname
    .split("/")
    .filter(Boolean)
    .at(-1);

  return navItems.some((item) => item.key === section)
    ? section
    : "documents";
}

function WorkspaceStatusPanel({
  type,
  title,
  message,
  onRetry,
}) {
  return (
    <div className="empty-state compact dashboard-state">
      {type === "loading" ? (
        <Loader2 className="spinner" size={34} />
      ) : (
        <AlertCircle size={34} />
      )}
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button
          className="secondary-action"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  );
}

function WorkspaceSidebarProfile({
  user,
  isOpen,
  onToggle,
  onClose,
  onLogout,
}) {
  return (
    <div className="workspace-sidebar-profile">
      <button
        className="workspace-avatar-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="avatar-initials">
          {getInitials(user)}
        </span>
        <span className="workspace-profile-copy">
          <strong>
            {user?.firstName} {user?.lastName}
          </strong>
          <span>{user?.email}</span>
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="workspace-profile-menu" role="menu">
          <div className="profile-menu-header">
            <strong>
              {user?.firstName} {user?.lastName}
            </strong>
            <span>{user?.email}</span>
          </div>

          <div className="storage-usage">
            <div className="storage-copy">
              <span>Storage</span>
              <strong>45MB / 100MB</strong>
            </div>
            <div className="storage-track">
              <span style={{ width: "45%" }} />
            </div>
          </div>

          <Link
            className="profile-menu-item"
            to="/dashboard"
            role="menuitem"
            onClick={onClose}
          >
            <Settings size={17} />
            Profile Settings
          </Link>

          <button
            className="profile-menu-item logout-menu-item"
            type="button"
            role="menuitem"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function DocumentsTab() {
  const { workspaceId } = useParams();
  const { token } = useAuth();

  const [documents, setDocuments] =
    useState(initialDocuments);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isUploadingDocument, setIsUploadingDocument] =
    useState(false);

  const [uploadError, setUploadError] =
    useState("");

  const [previewDocument, setPreviewDocument] =
    useState(null);

  const [summaryState, setSummaryState] =
    useState(null);

  const [comparison, setComparison] = useState({
    firstDocumentId: initialDocuments[0].id,
    secondDocumentId: initialDocuments[2].id,
    topic: "citation quality and buyer risk",
    hasResult: false,
  });

  const [extractionPrompt, setExtractionPrompt] =
    useState("all dates and dollar amounts");

  const [sortConfig, setSortConfig] = useState({
    key: "field",
    direction: "asc",
  });

  const extractionRef = useRef(null);

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) =>
        document.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [documents, searchTerm]
  );

  const summaryDocument = documents.find(
    (document) => document.id === summaryState?.documentId
  );

  const sortedExtractionRows = useMemo(() => {
    const rows = [...extractionRows];

    rows.sort((first, second) => {
      const firstValue = first[sortConfig.key];
      const secondValue = second[sortConfig.key];

      if (firstValue < secondValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }

      if (firstValue > secondValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }

      return 0;
    });

    return rows;
  }, [sortConfig]);

  useEffect(() => {
    if (!summaryState?.isLoading) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSummaryState((current) =>
        current
          ? {
              ...current,
              isLoading: false,
              cached: false,
              text: summaryCopy[current.level],
            }
          : current
      );
    }, 750);

    return () => window.clearTimeout(timer);
  }, [
    summaryState?.documentId,
    summaryState?.level,
    summaryState?.isLoading,
  ]);

  function openSummary(document) {
    const cached = document.id === "market-outlook";

    setSummaryState({
      documentId: document.id,
      level: "executive",
      cached,
      isLoading: !cached,
      text: cached ? summaryCopy.executive : "",
    });
  }

  function handleLevelChange(level) {
    setSummaryState((current) => {
      if (!current) {
        return current;
      }

      const cached =
        current.documentId === "market-outlook" &&
        level === "executive";

      return {
        ...current,
        level,
        cached,
        isLoading: !cached,
        text: cached ? summaryCopy[level] : "",
      };
    });
  }

  function handleRegenerate() {
    setSummaryState((current) =>
      current
        ? {
            ...current,
            cached: false,
            isLoading: true,
            text: "",
          }
        : current
    );
  }

  function renameDocument(document) {
    const nextName = window.prompt(
      "Rename document",
      document.name
    );

    if (!nextName?.trim()) {
      return;
    }

    setDocuments((current) =>
      current.map((item) =>
        item.id === document.id
          ? {
              ...item,
              name: nextName.trim(),
            }
          : item
      )
    );
  }

  function deleteDocument(documentId) {
    setDocuments((current) =>
      current.filter((document) => document.id !== documentId)
    );
  }

  async function handleDocumentUpload(event) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";

    if (
      selectedFiles.length === 0 ||
      !workspaceId ||
      !token
    ) {
      return;
    }

    setIsUploadingDocument(true);
    setUploadError("");

    try {
      const uploadedDocuments = [];

      for (const file of selectedFiles) {
        const response = await uploadDocument(
          workspaceId,
          file,
          token
        );

        uploadedDocuments.push(
          mapUploadedDocument(response.document)
        );
      }

      setDocuments((current) => [
        ...uploadedDocuments,
        ...current,
      ]);
    } catch (error) {
      setUploadError(
        error.message ||
          "Unable to upload document."
      );
    } finally {
      setIsUploadingDocument(false);
    }
  }

  function handleCompare() {
    setComparison((current) => ({
      ...current,
      hasResult:
        Boolean(current.topic.trim()) &&
        current.firstDocumentId !== current.secondDocumentId,
    }));
  }

  function openExtraction(document) {
    setExtractionPrompt(
      `dates, dollar amounts, and obligations in ${document.name}`
    );
    extractionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleSort(key) {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function exportCsv() {
    const header = ["Field", "Value", "Type", "Source"];
    const rows = sortedExtractionRows.map((row) => [
      row.field,
      row.value,
      row.type,
      row.source,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "documind-extraction.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="documents-tab">
      <label
        className={
          isUploadingDocument
            ? "upload-zone is-uploading"
            : "upload-zone"
        }
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          multiple
          disabled={isUploadingDocument}
          onChange={handleDocumentUpload}
        />
        {isUploadingDocument ? (
          <Loader2 className="spinner" size={30} />
        ) : (
          <UploadCloud size={30} />
        )}
        <strong>
          {isUploadingDocument
            ? "Uploading document"
            : "Drop files here or click to upload"}
        </strong>
        <span>
          PDF, DOCX, TXT, and CSV files are supported.
        </span>
      </label>

      {uploadError && (
        <div className="form-error upload-error">
          {uploadError}
        </div>
      )}

      <div className="document-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search documents by name"
          />
        </label>

        <button className="secondary-action" type="button">
          <GitCompareArrows size={17} />
          Compare
        </button>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state compact">
          <img src={documindHero} alt="" />
          <h2>No documents yet. Upload your first file to get started.</h2>
        </div>
      ) : (
        <div className="document-table-wrap">
          <table className="document-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Format</th>
                <th>Pages</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => {
                const FormatIcon = getFormatIcon(document.format);

                return (
                  <tr key={document.id}>
                    <td>
                      <div className="document-name-cell">
                        <span className="file-icon">
                          <FormatIcon size={18} />
                        </span>
                        <strong>{document.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="badge neutral">
                        {document.format}
                      </span>
                    </td>
                    <td>{document.pages}</td>
                    <td>{document.size}</td>
                    <td>{document.uploadedAt}</td>
                    <td>
                      <span
                        className={`badge status-${document.status}`}
                      >
                        {statusLabels[document.status]}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => openSummary(document)}
                        >
                          Summarize
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(document)}
                        >
                          <Eye size={15} />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => renameDocument(document)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => openExtraction(document)}
                        >
                          Extract
                        </button>
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => deleteDocument(document.id)}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SummaryPanel
        summaryState={summaryState}
        document={summaryDocument}
        onLevelChange={handleLevelChange}
        onRegenerate={handleRegenerate}
      />

      <section className="comparison-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Cross-Document Comparison</p>
            <h2>Compare source positions</h2>
          </div>
        </header>

        <div className="step-form">
          <div className="form-group">
            <label htmlFor="first-document">Step 1: First document</label>
            <select
              id="first-document"
              value={comparison.firstDocumentId}
              onChange={(event) =>
                setComparison((current) => ({
                  ...current,
                  firstDocumentId: event.target.value,
                  hasResult: false,
                }))
              }
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="second-document">
              Step 1: Second document
            </label>
            <select
              id="second-document"
              value={comparison.secondDocumentId}
              onChange={(event) =>
                setComparison((current) => ({
                  ...current,
                  secondDocumentId: event.target.value,
                  hasResult: false,
                }))
              }
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="comparison-topic">
              Step 2: Comparison topic
            </label>
            <input
              id="comparison-topic"
              value={comparison.topic}
              onChange={(event) =>
                setComparison((current) => ({
                  ...current,
                  topic: event.target.value,
                  hasResult: false,
                }))
              }
              placeholder="Example: compliance obligations"
            />
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={handleCompare}
          >
            <GitCompareArrows size={17} />
            Step 3: Compare
          </button>
        </div>

        {comparison.hasResult && (
          <article className="comparison-result">
            <h3>Comparative response</h3>
            <p>
              Both documents connect {comparison.topic} to traceable AI
              review. The outlook report frames it as a buyer requirement,
              while the interview notes describe it as a daily workflow
              blocker when source passages are hard to inspect.
            </p>
            <div className="citation-chip-row">
              <button type="button">2026 Market Outlook.pdf, p.3</button>
              <button type="button">Customer Interview Notes.docx, p.2</button>
            </div>
          </article>
        )}
      </section>

      <section className="extraction-panel" ref={extractionRef}>
        <header className="panel-header">
          <div>
            <p className="eyebrow">Structured Extraction</p>
            <h2>Extract review-ready fields</h2>
          </div>
          <button
            className="secondary-action"
            type="button"
            onClick={exportCsv}
          >
            <Download size={17} />
            Export CSV
          </button>
        </header>

        <div className="extract-control">
          <label htmlFor="extract-prompt">
            What do you want to extract?
          </label>
          <div>
            <input
              id="extract-prompt"
              value={extractionPrompt}
              onChange={(event) =>
                setExtractionPrompt(event.target.value)
              }
              placeholder="Example: all dates and dollar amounts"
            />
            <button className="primary-action" type="button">
              <Table2 size={17} />
              Extract
            </button>
          </div>
        </div>

        <div className="extraction-table-wrap">
          <table className="extraction-table">
            <thead>
              <tr>
                {["field", "value", "type", "source"].map((key) => (
                  <th key={key}>
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                    >
                      {key}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedExtractionRows.map((row) => (
                <tr key={`${row.field}-${row.source}`}>
                  <td>{row.field}</td>
                  <td>{row.value}</td>
                  <td>{row.type}</td>
                  <td>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PreviewPanel
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}

export function ChatTab() {
  const [conversations, setConversations] =
    useState(initialConversations);

  const [activeConversationId, setActiveConversationId] =
    useState(initialConversations[0].id);

  const [conversationSearch, setConversationSearch] =
    useState("");

  const [messageInput, setMessageInput] =
    useState("");

  const [isTyping, setIsTyping] = useState(false);

  const [activeCitation, setActiveCitation] =
    useState(null);

  const messageEndRef = useRef(null);
  const isAwaitingResponseRef = useRef(false);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title
      .toLowerCase()
      .includes(conversationSearch.toLowerCase())
  );

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeConversation?.messages.length, isTyping]);

  function createConversation() {
    const id = `conv-${Date.now()}`;

    setConversations((current) => [
      {
        id,
        title: "New Conversation",
        timestamp: "Just now",
        messages: [],
      },
      ...current,
    ]);
    setActiveConversationId(id);
    setActiveCitation(null);
  }

  function sendMessage(event) {
    event.preventDefault();

    if (isAwaitingResponseRef.current) {
      return;
    }

    const text = messageInput.trim();

    if (!text || !activeConversation || isTyping) {
      return;
    }

    isAwaitingResponseRef.current = true;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title:
                conversation.title === "New Conversation"
                  ? text.slice(0, 34)
                  : conversation.title,
              timestamp: "Just now",
              messages: [
                ...conversation.messages,
                userMessage,
              ],
            }
          : conversation
      )
    );

    setMessageInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  {
                    id: `ai-${Date.now()}`,
                    role: "ai",
                    text:
                      "The strongest evidence points to citation quality and review traceability. The source passages show that buyers want answers they can audit before sharing with stakeholders.",
                    citations: [
                      {
                        id: `citation-${Date.now()}`,
                        label: "2026 Market Outlook.pdf, p.3",
                        source:
                          "Enterprise buyers increasingly require retrieval transparency and an audit trail for AI-generated answers.",
                      },
                    ],
                  },
                ],
              }
            : conversation
        )
      );
      isAwaitingResponseRef.current = false;
      setIsTyping(false);
    }, 900);
  }

  return (
    <div className="chat-layout">
      <aside className="conversation-list">
        <div className="conversation-toolbar">
          <label className="search-field">
            <Search size={17} />
            <input
              type="search"
              value={conversationSearch}
              onChange={(event) =>
                setConversationSearch(event.target.value)
              }
              placeholder="Search conversations"
            />
          </label>

          <button
            className="primary-action"
            type="button"
            onClick={createConversation}
          >
            New Conversation
          </button>
        </div>

        <div className="conversation-items">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              className={
                conversation.id === activeConversationId
                  ? "conversation-item is-active"
                  : "conversation-item"
              }
              type="button"
              onClick={() => {
                setActiveConversationId(conversation.id);
                setActiveCitation(null);
              }}
            >
              <strong>{conversation.title}</strong>
              <span>{conversation.timestamp}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <div className="message-stream">
          {activeConversation?.messages.length ? (
            activeConversation.messages.map((message) => (
              <article
                key={message.id}
                className={`message-bubble ${message.role}`}
              >
                <p>{message.text}</p>
                {message.citations?.length > 0 && (
                  <div className="citation-chip-row">
                    {message.citations.map((citation) => (
                      <button
                        key={citation.id}
                        type="button"
                        onClick={() => setActiveCitation(citation)}
                      >
                        [{citation.label}]
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="chat-empty-state">
              <Bot size={36} />
              <h2>Ask a question about your documents</h2>
              <p>
                Start with a source-backed question, then inspect any
                citation chip in the response.
              </p>
            </div>
          )}

          {isTyping && (
            <div className="typing-indicator" aria-label="AI is typing">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {activeCitation && (
          <aside className="citation-popover">
            <header>
              <strong>{activeCitation.label}</strong>
              <button
                className="icon-button"
                type="button"
                aria-label="Close citation"
                onClick={() => setActiveCitation(null)}
              >
                <X size={16} />
              </button>
            </header>
            <p>
              <mark>{activeCitation.source}</mark>
            </p>
          </aside>
        )}

        <form className="chat-input-bar" onSubmit={sendMessage}>
          <input
            value={messageInput}
            onChange={(event) =>
              setMessageInput(event.target.value)
            }
            disabled={isTyping}
            placeholder={
              isTyping
                ? "Waiting for response"
                : "Ask about your documents"
            }
          />
          <button
            className="primary-action"
            type="submit"
            aria-label="Send message"
            disabled={isTyping || !messageInput.trim()}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}

export function AnalyticsTab() {
  const referencedDocs = [
    {
      label: "Market Outlook",
      value: 84,
    },
    {
      label: "Interview Notes",
      value: 64,
    },
    {
      label: "Vendor Matrix",
      value: 51,
    },
    {
      label: "Revenue Model",
      value: 38,
    },
  ];

  return (
    <div className="analytics-tab">
      <div className="analytics-filter">
        <label htmlFor="date-range">Date range</label>
        <select id="date-range" defaultValue="30">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="analytics-grid">
        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Queries</p>
              <h2>Total queries over time</h2>
            </div>
            <Sparkles size={20} />
          </header>
          <svg
            className="line-chart"
            viewBox="0 0 420 180"
            role="img"
            aria-label="Line chart showing queries increasing"
          >
            <polyline
              points="10,145 80,116 150,128 220,88 290,72 360,42 410,54"
            />
            <circle cx="360" cy="42" r="5" />
          </svg>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">References</p>
              <h2>Most referenced documents</h2>
            </div>
            <FileText size={20} />
          </header>
          <div className="bar-list">
            {referencedDocs.map((item) => (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${item.value}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Types</p>
              <h2>Document type breakdown</h2>
            </div>
            <PieChart size={20} />
          </header>
          <div className="donut-chart-row">
            <div className="donut-chart" />
            <ul className="donut-legend">
              <li><span className="legend-indigo" />PDF 48%</li>
              <li><span className="legend-teal" />DOCX 22%</li>
              <li><span className="legend-amber" />CSV 18%</li>
              <li><span className="legend-gray" />TXT 12%</li>
            </ul>
          </div>
        </article>

        <article className="chart-card">
          <header>
            <div>
              <p className="eyebrow">Satisfaction</p>
              <h2>User satisfaction ratings</h2>
            </div>
            <BarChart3 size={20} />
          </header>
          <div className="satisfaction-card">
            <strong>4.6/5</strong>
            <p>Average answer rating from 38 responses.</p>
            <div className="rating-bars">
              {[92, 78, 42, 18].map((value) => (
                <span key={value}>
                  <i style={{ width: `${value}%` }} />
                </span>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function WorkspacePage() {
  const { workspaceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token,
    user,
    logout,
  } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const [workspace, setWorkspace] =
    useState(null);

  const [isLoadingWorkspace, setIsLoadingWorkspace] =
    useState(true);

  const [workspaceError, setWorkspaceError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      if (!token || !workspaceId) {
        setIsLoadingWorkspace(false);
        return;
      }

      setIsLoadingWorkspace(true);
      setWorkspaceError("");

      try {
        const response =
          await getWorkspaceRequest(
            workspaceId,
            token
          );

        if (isMounted) {
          setWorkspace(response.workspace);
        }
      } catch (error) {
        if (isMounted) {
          setWorkspaceError(
            error.message ||
              "Unable to load this workspace."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingWorkspace(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [token, workspaceId, reloadKey]);

  const activeSection = getActiveSection(
    location.pathname
  );

  const activeNavItem =
    navItems.find(
      (item) => item.key === activeSection
    ) ?? navItems[0];

  const workspaceName =
    workspace?.name ?? "Workspace";

  const workspaceColor =
    workspace?.color ?? defaultWorkspaceColor;

  function handleLogout() {
    logout();
    navigate("/", {
      replace: true,
    });
  }

  return (
    <section
      className={
        activeSection === "chat"
          ? "workspace-page is-chat-section"
          : "workspace-page"
      }
    >
      {isSidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={
          isSidebarOpen
            ? "workspace-sidebar is-open"
            : "workspace-sidebar"
        }
      >
        <div className="sidebar-workspace-title">
          <span style={{ background: workspaceColor }} />
          <strong>{workspaceName}</strong>
        </div>

        <nav className="workspace-nav" aria-label="Workspace">
          {navItems.map(({ key, label, icon: Icon }) => (
            <NavLink
              key={key}
              to={key}
              className={({ isActive }) =>
                isActive
                  ? "workspace-nav-link is-active"
                  : "workspace-nav-link"
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <WorkspaceSidebarProfile
          user={user}
          isOpen={isProfileOpen}
          onToggle={() =>
            setIsProfileOpen((current) => !current)
          }
          onClose={() => {
            setIsProfileOpen(false);
            setIsSidebarOpen(false);
          }}
          onLogout={handleLogout}
        />
      </aside>

      <div className="workspace-main">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open sidebar"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        <div className="workspace-content">
          <p className="eyebrow workspace-section-title">
            {activeNavItem.label}
          </p>

          {isLoadingWorkspace ? (
            <WorkspaceStatusPanel
              type="loading"
              title="Loading workspace"
              message="Fetching the workspace details from the API."
            />
          ) : workspaceError ? (
            <WorkspaceStatusPanel
              type="error"
              title="Unable to load workspace"
              message={workspaceError}
              onRetry={() =>
                setReloadKey((current) => current + 1)
              }
            />
          ) : (
            <Outlet context={{ workspace }} />
          )}
        </div>
      </div>
    </section>
  );
}

export default WorkspacePage;
