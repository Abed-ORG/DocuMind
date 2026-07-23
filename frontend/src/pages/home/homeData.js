import {
  FileText,
  GitCompareArrows,
  MessageSquareText,
  ScanText,
  UploadCloud,
} from "lucide-react";

export const features = [
  {
    icon: UploadCloud,
    title: "Document Upload",
    description:
      "Bring PDF, DOCX, TXT, and CSV files into focused workspaces with visible processing states.",
  },
  {
    icon: MessageSquareText,
    title: "AI Q&A With Citations",
    description:
      "Ask natural questions and review answers with source chips tied back to the original page.",
  },
  {
    icon: FileText,
    title: "Summarization",
    description:
      "Switch between one-liner, executive, and detailed summaries without leaving the document flow.",
  },
  {
    icon: GitCompareArrows,
    title: "Cross-Doc Comparison",
    description:
      "Compare two files against the same topic and see what agrees, conflicts, or needs review.",
  },
  {
    icon: ScanText,
    title: "Structured Extraction",
    description:
      "Turn dates, amounts, obligations, and entities into sortable tables that can be exported.",
  },
];

export const workflowSteps = [
  {
    step: "01",
    title: "Create a workspace",
    description:
      "Group documents by client, matter, project, or research stream.",
  },
  {
    step: "02",
    title: "Upload and process",
    description:
      "DocuMind extracts pages, tracks status, and prepares content for retrieval.",
  },
  {
    step: "03",
    title: "Ask, cite, compare",
    description:
      "Use chat, summaries, analytics, and extraction to move from files to evidence.",
  },
];
