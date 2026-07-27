import {
  BarChart3,
  FileText,
  MessageSquareText,
} from "lucide-react";

export const defaultWorkspaceColor = "#4F46E5";

export const navItems = [
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

export const statusLabels = {
  uploaded: "Uploaded",
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export const supportedUploadExtensions = new Set([
  "pdf",
  "docx",
  "txt",
  "csv",
]);

export const maxUploadSizeBytes =
  10 * 1024 * 1024;

export const maxUploadSizeLabel = "10MB";

export const summaryLevels = [
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

export const summaryCopy = {
  oneLiner:
    "The document shows rising demand for cited AI answers in regulated document workflows.",
  executive:
    "The document argues that document intelligence tools are moving from simple search toward source-grounded AI workspaces. The strongest demand comes from teams that need answers, summaries, comparisons, and structured extraction while preserving citation traceability.",
  detailed:
    "The document frames document intelligence as an operational layer for high-volume review work. It highlights a shift from unmanaged file search to workspace-based analysis, then connects that shift to buyer requirements around auditability, citations, extraction quality, and cross-document comparison. The strongest adoption signals come from legal, finance, policy, and research teams that need evidence they can inspect.",
};

export const extractionRows = [
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

export const initialConversations = [
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

export const referencedDocs = [
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
