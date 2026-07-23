import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router";

import { useAuth } from "../../context/AuthContext";
import { uploadDocument } from "../../services/api";
import CrossDocumentComparison from "./components/CrossDocumentComparison";
import DocumentTable from "./components/DocumentTable";
import DocumentUpload from "./components/DocumentUpload";
import PreviewPanel from "./components/PreviewPanel";
import StructuredExtraction from "./components/StructuredExtraction";
import SummaryPanel from "./components/SummaryPanel";
import {
  extractionRows,
  initialDocuments,
  summaryCopy,
} from "./workspaceData";
import {
  createUploadId,
  documentNameExists,
  formatFileSize,
  getDuplicateDocumentName,
  mapUploadedDocument,
  validateUploadFile,
} from "./workspaceUtils";

const uploadNotificationDurationMs = 5000;

function DocumentsTab() {
  const { workspaceId } = useParams();
  const { token } = useAuth();

  const [documents, setDocuments] =
    useState(initialDocuments);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isUploadingDocument, setIsUploadingDocument] =
    useState(false);

  const [isDraggingDocument, setIsDraggingDocument] =
    useState(false);

  const [uploadQueue, setUploadQueue] =
    useState([]);

  const [uploadTimerTick, setUploadTimerTick] =
    useState(() => Date.now());

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

  const uploadError = useMemo(
    () =>
      uploadQueue
        .filter((item) => item.status === "failed")
        .map((item) => item.error)
        .join(" "),
    [uploadQueue]
  );

  const visibleUploadQueue = useMemo(
    () =>
      uploadQueue.map((item) => {
        if (!item.expiresAt) {
          return item;
        }

        const remainingMs = Math.max(
          0,
          item.expiresAt - uploadTimerTick
        );

        return {
          ...item,
          secondsRemaining: Math.ceil(
            remainingMs / 1000
          ),
        };
      }),
    [uploadQueue, uploadTimerTick]
  );

  const hasExpiringUploadMessages = uploadQueue.some(
    (item) => item.expiresAt
  );

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

  useEffect(() => {
    if (
      !hasExpiringUploadMessages
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();

      setUploadTimerTick(now);
      setUploadQueue((current) =>
        current.filter(
          (item) =>
            !item.expiresAt || item.expiresAt > now
        )
      );
    }, 250);

    return () => window.clearInterval(timer);
  }, [hasExpiringUploadMessages]);

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

  function updateUploadQueueItem(id, updates) {
    setUploadQueue((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
            }
          : item
      )
    );
  }

  function clearUploadMessages() {
    setUploadQueue([]);
  }

  function dismissUploadMessage(id) {
    setUploadQueue((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  }

  async function uploadFiles(files) {
    if (
      files.length === 0 ||
      !workspaceId ||
      !token
    ) {
      return;
    }

    const plannedDocumentNames = documents.map(
      (document) => document.name
    );

    const uploadItems = files.map((file) => {
      const error = validateUploadFile(file);
      let displayName = file.name;
      let isSkipped = false;
      let message = error;

      if (!error) {
        const isDuplicate = documentNameExists(
          file.name,
          plannedDocumentNames
        );

        if (isDuplicate) {
          const duplicateName =
            getDuplicateDocumentName(
              file.name,
              plannedDocumentNames
            );

          const shouldUploadDuplicate =
            window.confirm(
              `${file.name} already exists in this workspace.\n\nSelect OK to add it as "${duplicateName}", or Cancel to skip this file.`
            );

          if (shouldUploadDuplicate) {
            displayName = duplicateName;
            plannedDocumentNames.push(displayName);
          } else {
            isSkipped = true;
            message = `${file.name} was skipped because it already exists.`;
          }
        } else {
          plannedDocumentNames.push(displayName);
        }
      }

      return {
        id: createUploadId(file),
        file,
        name: displayName,
        size: formatFileSize(file.size),
        error: message,
        isSkipped,
      };
    });

    const now = Date.now();
    setUploadTimerTick(now);

    const initialQueue = uploadItems.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      progress: 0,
      status: item.error
        ? item.isSkipped
          ? "skipped"
          : "failed"
        : "queued",
      error: item.error,
      expiresAt: item.error
        ? now + uploadNotificationDurationMs
        : null,
    }));

    setUploadQueue((current) => [
      ...current,
      ...initialQueue,
    ]);

    const validUploadItems = uploadItems.filter(
      (item) => !item.error && !item.isSkipped
    );

    if (validUploadItems.length === 0) {
      return;
    }

    setIsUploadingDocument(true);

    for (const item of validUploadItems) {
      updateUploadQueueItem(item.id, {
        status: "uploading",
        progress: 0,
      });

      try {
        const response = await uploadDocument(
          workspaceId,
          item.file,
          token,
          {
            documentName: item.name,
            onProgress: (progress) => {
              updateUploadQueueItem(item.id, {
                progress,
              });
            },
          }
        );

        const finishedAt = Date.now();
        setUploadTimerTick(finishedAt);

        updateUploadQueueItem(item.id, {
          status: "complete",
          progress: 100,
          expiresAt:
            finishedAt + uploadNotificationDurationMs,
        });

        setDocuments((current) => [
          mapUploadedDocument(response.document),
          ...current,
        ]);
      } catch (error) {
        const message =
          error.message ||
          "Unable to upload document.";
        const uploadMessage = `${item.name}: ${message}`;

        const failedAt = Date.now();
        setUploadTimerTick(failedAt);

        updateUploadQueueItem(item.id, {
          status: "failed",
          error: uploadMessage,
          expiresAt:
            failedAt + uploadNotificationDurationMs,
        });
      }
    }

    setIsUploadingDocument(false);
  }

  function handleDocumentUpload(event) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";
    uploadFiles(selectedFiles);
  }

  function handleUploadDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploadingDocument) {
      setIsDraggingDocument(true);
    }
  }

  function handleUploadDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleUploadDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.relatedTarget &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsDraggingDocument(false);
  }

  function handleUploadDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setIsDraggingDocument(false);

    if (isUploadingDocument) {
      return;
    }

    uploadFiles(
      Array.from(event.dataTransfer.files ?? [])
    );
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
      <DocumentUpload
        isUploadingDocument={isUploadingDocument}
        isDraggingDocument={isDraggingDocument}
        uploadError={uploadError}
        uploadQueue={visibleUploadQueue}
        onFileChange={handleDocumentUpload}
        onDragEnter={handleUploadDragEnter}
        onDragOver={handleUploadDragOver}
        onDragLeave={handleUploadDragLeave}
        onDrop={handleUploadDrop}
        onClearMessages={clearUploadMessages}
        onDismissMessage={dismissUploadMessage}
      />

      <DocumentTable
        filteredDocuments={filteredDocuments}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onOpenSummary={openSummary}
        onOpenPreview={setPreviewDocument}
        onRenameDocument={renameDocument}
        onOpenExtraction={openExtraction}
        onDeleteDocument={deleteDocument}
      />

      <SummaryPanel
        summaryState={summaryState}
        document={summaryDocument}
        onLevelChange={handleLevelChange}
        onRegenerate={handleRegenerate}
      />

      <CrossDocumentComparison
        documents={documents}
        comparison={comparison}
        onComparisonChange={setComparison}
        onCompare={handleCompare}
      />

      <StructuredExtraction
        panelRef={extractionRef}
        extractionPrompt={extractionPrompt}
        rows={sortedExtractionRows}
        onExtractionPromptChange={setExtractionPrompt}
        onSort={handleSort}
        onExportCsv={exportCsv}
      />

      <PreviewPanel
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}

export default DocumentsTab;
