import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router";

import { useAuth } from "../../../context/AuthContext";
import {
  deleteDocument as deleteDocumentRequest,
  getDocumentFileBlob,
  getDocumentPreview,
  getDocuments,
  reprocessDocument as reprocessDocumentRequest,
  summarizeDocument as summarizeDocumentRequest,
  updateDocument as updateDocumentRequest,
  uploadDocument,
} from "../../../services/api";
import {
  DeleteDocumentDialog,
  DocumentTable,
  DuplicateDocumentDialog,
  PreviewPanel,
  RenameDocumentDialog,
  UploadDocumentsDialog,
} from "../components/documents";
import {
  CrossDocumentComparison,
  StructuredExtraction,
  SummaryPanel,
} from "../components/intelligence";
import {
  extractionRows,
} from "../data/workspaceData";
import {
  createUploadId,
  documentContentDuplicateExists,
  formatFileSize,
  getDuplicateDocumentName,
  getFileHash,
  mapApiDocument,
  validateUploadFile,
} from "../utils/workspaceUtils";

const uploadNotificationDurationMs = 5000;
const defaultComparisonTopic =
  "citation quality and buyer risk";

function DocumentsTab() {
  const { workspaceId } = useParams();
  const {
    token,
    refreshCurrentUser,
  } = useAuth();

  const [documents, setDocuments] =
    useState([]);

  const [isLoadingDocuments, setIsLoadingDocuments] =
    useState(true);

  const [documentsError, setDocumentsError] =
    useState("");

  const [documentsReloadKey, setDocumentsReloadKey] =
    useState(0);

  const [documentActionError, setDocumentActionError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [isUploadingDocument, setIsUploadingDocument] =
    useState(false);

  const [isDraggingDocument, setIsDraggingDocument] =
    useState(false);

  const [isUploadDialogOpen, setIsUploadDialogOpen] =
    useState(false);

  const [renameDialogDocument, setRenameDialogDocument] =
    useState(null);

  const [renameDialogError, setRenameDialogError] =
    useState("");

  const [isRenamingDocument, setIsRenamingDocument] =
    useState(false);

  const [deleteDialogDocument, setDeleteDialogDocument] =
    useState(null);

  const [deleteDialogError, setDeleteDialogError] =
    useState("");

  const [isDeletingDocument, setIsDeletingDocument] =
    useState(false);

  const [duplicateDialog, setDuplicateDialog] =
    useState(null);

  const [uploadQueue, setUploadQueue] =
    useState([]);

  const [uploadTimerTick, setUploadTimerTick] =
    useState(() => Date.now());

  const [previewDocument, setPreviewDocument] =
    useState(null);

  const [previewState, setPreviewState] =
    useState({
      type: "text",
      isLoading: false,
      error: "",
      pages: [],
      table: null,
      html: "",
      fileUrl: "",
    });

  const [summaryState, setSummaryState] =
    useState(null);

  const [comparison, setComparison] = useState({
    firstDocumentId: "",
    secondDocumentId: "",
    topic: defaultComparisonTopic,
    hasResult: false,
  });

  const [extractionPrompt, setExtractionPrompt] =
    useState("all dates and dollar amounts");

  const [sortConfig, setSortConfig] = useState({
    key: "field",
    direction: "asc",
  });

  const summaryRef = useRef(null);
  const extractionRef = useRef(null);
  const duplicateDecisionResolverRef = useRef(null);

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

  const hasProcessingDocuments = documents.some(
    (document) => document.status === "processing"
  );

  const comparisonSelection = useMemo(() => {
    const documentIds = new Set(
      documents.map((document) => document.id)
    );

    const firstDocumentId = documentIds.has(
      comparison.firstDocumentId
    )
      ? comparison.firstDocumentId
      : documents[0]?.id ?? "";

    const secondDocumentId = documentIds.has(
      comparison.secondDocumentId
    )
      ? comparison.secondDocumentId
      : documents.find(
          (document) => document.id !== firstDocumentId
        )?.id ?? "";

    return {
      ...comparison,
      firstDocumentId,
      secondDocumentId,
      hasResult:
        comparison.hasResult &&
        firstDocumentId === comparison.firstDocumentId &&
        secondDocumentId === comparison.secondDocumentId,
    };
  }, [documents, comparison]);

  const previewDocumentId = previewDocument?.id ?? "";

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      if (!workspaceId || !token) {
        setDocuments([]);
        setIsLoadingDocuments(false);
        return;
      }

      if (documentsReloadKey === 0) {
        setIsLoadingDocuments(true);
      }
      setDocumentsError("");
      setDocumentActionError("");

      try {
        const response = await getDocuments(
          workspaceId,
          token
        );

        if (isMounted) {
          const nextDocuments =
            response.documents.map(mapApiDocument);
          const documentIds = new Set(
            nextDocuments.map((document) => document.id)
          );

          setDocuments(nextDocuments);
          setPreviewDocument((current) =>
            current
              ? nextDocuments.find(
                  (document) => document.id === current.id
                ) ?? null
              : current
          );
          setSummaryState((current) =>
            current && documentIds.has(current.documentId)
              ? current
              : null
          );
        }
      } catch (error) {
        if (isMounted) {
          setDocuments([]);
          setDocumentsError(
            error.message ||
              "Unable to load documents."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocuments(false);
        }
      }
    }

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, token, documentsReloadKey]);

  useEffect(() => {
    let isActive = true;

    async function loadDocumentPreview() {
      if (!previewDocumentId || !workspaceId || !token) {
        setPreviewState({
          type: "text",
          isLoading: false,
          error: "",
          pages: [],
          table: null,
          html: "",
          fileUrl: "",
        });
        return;
      }

      setPreviewState({
        type: "text",
        isLoading: true,
        error: "",
        pages: [],
        table: null,
        html: "",
        fileUrl: "",
      });

      try {
        const response = await getDocumentPreview(
          workspaceId,
          previewDocumentId,
          token
        );
        const previewType =
          response.preview?.type ?? "text";
        const fileUrl =
          previewType === "file"
            ? URL.createObjectURL(
                await getDocumentFileBlob(
                  workspaceId,
                  previewDocumentId,
                  token
                )
              )
            : "";

        if (isActive) {
          setPreviewState({
            type: previewType,
            isLoading: false,
            error: "",
            pages: Array.isArray(
              response.preview?.pages
            )
              ? response.preview.pages
              : [],
            table: response.preview?.table ?? null,
            html: response.preview?.html ?? "",
            fileUrl,
          });
        } else if (fileUrl) {
          URL.revokeObjectURL(fileUrl);
        }
      } catch (error) {
        if (isActive) {
          setPreviewState({
            type: "text",
            isLoading: false,
            error:
              error.message ||
              "Unable to load document preview.",
            pages: [],
            table: null,
            html: "",
            fileUrl: "",
          });
        }
      }
    }

    loadDocumentPreview();

    return () => {
      isActive = false;
    };
  }, [previewDocumentId, workspaceId, token]);

  useEffect(
    () => () => {
      if (previewState.fileUrl) {
        URL.revokeObjectURL(previewState.fileUrl);
      }
    },
    [previewState.fileUrl]
  );

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      if (
        !summaryState?.isLoading ||
        !summaryState.documentId ||
        !summaryState.level ||
        !workspaceId ||
        !token
      ) {
        return;
      }

      try {
        const response =
          await summarizeDocumentRequest(
            workspaceId,
            summaryState.documentId,
            {
              level: summaryState.level,
              force: summaryState.force,
            },
            token
          );

        if (!isActive) {
          return;
        }

        setSummaryState((current) => {
          if (
            !current ||
            current.documentId !==
              summaryState.documentId ||
            current.level !== summaryState.level ||
            current.requestKey !==
              summaryState.requestKey
          ) {
            return current;
          }

          return {
            ...current,
            cached: Boolean(response.cached),
            isLoading: false,
            force: false,
            error: "",
            text: response.summary?.content ?? "",
          };
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSummaryState((current) => {
          if (
            !current ||
            current.documentId !==
              summaryState.documentId ||
            current.level !== summaryState.level ||
            current.requestKey !==
              summaryState.requestKey
          ) {
            return current;
          }

          return {
            ...current,
            cached: false,
            isLoading: false,
            force: false,
            error:
              error.message ||
              "Unable to generate summary.",
            text: "",
          };
        });
      }
    }

    loadSummary();

    return () => {
      isActive = false;
    };
  }, [
    summaryState?.documentId,
    summaryState?.level,
    summaryState?.isLoading,
    summaryState?.requestKey,
    summaryState?.force,
    workspaceId,
    token,
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

  useEffect(() => {
    if (!hasProcessingDocuments) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setDocumentsReloadKey((current) => current + 1);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [hasProcessingDocuments]);

  useEffect(
    () => () => {
      duplicateDecisionResolverRef.current?.(false);
    },
    []
  );

  useEffect(() => {
    if (!summaryState?.documentId) {
      return undefined;
    }

    const animationFrameId =
      window.requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    summaryState?.documentId,
    summaryState?.scrollKey,
  ]);

  function openSummary(document) {
    setSummaryState({
      documentId: document.id,
      level: "executive",
      cached: false,
      isLoading: true,
      force: false,
      requestKey: 0,
      scrollKey: Date.now(),
      error: "",
      text: "",
    });
  }

  function handleLevelChange(level) {
    setSummaryState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        level,
        cached: false,
        isLoading: true,
        force: false,
        requestKey: current.requestKey + 1,
        error: "",
        text: "",
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
            force: true,
            requestKey: current.requestKey + 1,
            error: "",
            text: "",
          }
        : current
    );
  }

  function openRenameDialog(document) {
    setRenameDialogDocument(document);
    setRenameDialogError("");
  }

  function closeRenameDialog() {
    setRenameDialogDocument(null);
    setRenameDialogError("");
    setIsRenamingDocument(false);
  }

  async function submitRenameDocument(nextName) {
    if (!renameDialogDocument) {
      return;
    }

    const trimmedName = nextName.trim();

    if (!trimmedName) {
      setRenameDialogError(
        "Document name cannot be empty."
      );
      return;
    }

    const nameAlreadyExists = documents.some(
      (document) =>
        document.id !== renameDialogDocument.id &&
        document.name.toLowerCase() ===
          trimmedName.toLowerCase()
    );

    if (nameAlreadyExists) {
      setRenameDialogError(
        "Another document already uses this name."
      );
      return;
    }

    if (!workspaceId || !token) {
      setRenameDialogError(
        "Unable to rename document without an active session."
      );
      return;
    }

    setIsRenamingDocument(true);
    setRenameDialogError("");
    setDocumentActionError("");

    try {
      const response =
        await updateDocumentRequest(
          workspaceId,
          renameDialogDocument.id,
          {
            originalName: trimmedName,
          },
          token
        );

      const updatedDocument = mapApiDocument(
        response.document
      );

      setDocuments((current) =>
        current.map((item) =>
          item.id === updatedDocument.id
            ? updatedDocument
            : item
        )
      );
      setPreviewDocument((current) =>
        current?.id === updatedDocument.id
          ? updatedDocument
          : current
      );

      closeRenameDialog();
    } catch (error) {
      setRenameDialogError(
        error.message ||
          "Unable to rename document."
      );
    } finally {
      setIsRenamingDocument(false);
    }
  }

  function openDeleteDialog(document) {
    setDeleteDialogDocument(document);
    setDeleteDialogError("");
    setDocumentActionError("");
  }

  function closeDeleteDialog() {
    setDeleteDialogDocument(null);
    setDeleteDialogError("");
    setIsDeletingDocument(false);
  }

  async function confirmDeleteDocument() {
    if (!deleteDialogDocument) {
      return;
    }

    if (!workspaceId || !token) {
      setDeleteDialogError(
        "Unable to delete document without an active session."
      );
      return;
    }

    setDocumentActionError("");
    setDeleteDialogError("");
    setIsDeletingDocument(true);

    try {
      const documentId = deleteDialogDocument.id;

      await deleteDocumentRequest(
        workspaceId,
        documentId,
        token
      );

      setDocuments((current) =>
        current.filter(
          (document) => document.id !== documentId
        )
      );
      setPreviewDocument((current) =>
        current?.id === documentId ? null : current
      );
      setSummaryState((current) =>
        current?.documentId === documentId
          ? null
          : current
      );
      refreshCurrentUser().catch((error) => {
        console.error(
          "User storage refresh failed:",
          error
        );
      });
      closeDeleteDialog();
    } catch (error) {
      setDeleteDialogError(
        error.message ||
          "Unable to delete document."
      );
    } finally {
      setIsDeletingDocument(false);
    }
  }

  async function reprocessFailedDocument(document) {
    if (!workspaceId || !token) {
      setDocumentActionError(
        "Unable to reprocess document without an active session."
      );
      return;
    }

    setDocumentActionError("");

    try {
      const response =
        await reprocessDocumentRequest(
          workspaceId,
          document.id,
          token
        );
      const updatedDocument = mapApiDocument(
        response.document
      );

      setDocuments((current) =>
        current.map((item) =>
          item.id === updatedDocument.id
            ? updatedDocument
            : item
        )
      );
      setPreviewDocument((current) =>
        current?.id === updatedDocument.id
          ? updatedDocument
          : current
      );
      setSummaryState((current) =>
        current?.documentId === updatedDocument.id
          ? null
          : current
      );
    } catch (error) {
      setDocumentActionError(
        error.message ||
          "Unable to reprocess document."
      );
    }
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

  function requestDuplicateUploadDecision({
    fileName,
    duplicateName,
  }) {
    return new Promise((resolve) => {
      duplicateDecisionResolverRef.current = resolve;
      setDuplicateDialog({
        fileName,
        duplicateName,
      });
    });
  }

  function resolveDuplicateUploadDecision(shouldUpload) {
    duplicateDecisionResolverRef.current?.(shouldUpload);
    duplicateDecisionResolverRef.current = null;
    setDuplicateDialog(null);
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
    const plannedDocuments = [];

    const uploadItems = [];

    for (const file of files) {
      const error = validateUploadFile(file);
      let displayName = file.name;
      let contentHash = "";
      let isSkipped = false;
      let message = error;

      if (!error) {
        try {
          contentHash = await getFileHash(file);
        } catch {
          message =
            "Unable to inspect file contents for duplicate detection.";
        }
      }

      if (!message) {
        const isDuplicate =
          documentContentDuplicateExists({
            name: file.name,
            contentHash,
            documents,
            plannedDocuments,
          });

        if (isDuplicate) {
          const duplicateName =
            getDuplicateDocumentName(
              file.name,
              plannedDocumentNames
            );

          const shouldUploadDuplicate =
            await requestDuplicateUploadDecision({
              fileName: file.name,
              duplicateName,
            });

          if (shouldUploadDuplicate) {
            displayName = duplicateName;
            plannedDocumentNames.push(displayName);
            plannedDocuments.push({
              name: displayName,
              contentHash,
            });
          } else {
            isSkipped = true;
            message = `${file.name} was skipped because it already exists.`;
          }
        } else {
          plannedDocumentNames.push(displayName);
          plannedDocuments.push({
            name: displayName,
            contentHash,
          });
        }
      }

      uploadItems.push({
        id: createUploadId(file),
        file,
        name: displayName,
        size: formatFileSize(file.size),
        error: message,
        isSkipped,
      });
    }

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
          mapApiDocument(response.document),
          ...current,
        ]);
        refreshCurrentUser().catch((error) => {
          console.error(
            "User storage refresh failed:",
            error
          );
        });
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

  function isFileDragEvent(event) {
    return Array.from(
      event.dataTransfer?.types ?? []
    ).includes("Files");
  }

  function handleUploadButtonDragEnter(event) {
    if (!isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setIsUploadDialogOpen(true);

    if (!isUploadingDocument) {
      setIsDraggingDocument(true);
    }
  }

  function handleUploadButtonDragOver(event) {
    if (!isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleUploadButtonDrop(event) {
    if (!isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setIsUploadDialogOpen(true);
    setIsDraggingDocument(false);

    if (isUploadingDocument) {
      return;
    }

    uploadFiles(
      Array.from(event.dataTransfer.files ?? [])
    );
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

  function closeUploadDialog() {
    setIsDraggingDocument(false);
    setIsUploadDialogOpen(false);
  }

  function handleCompare() {
    setComparison((current) => ({
      ...current,
      firstDocumentId:
        comparisonSelection.firstDocumentId,
      secondDocumentId:
        comparisonSelection.secondDocumentId,
      hasResult:
        documents.length >= 2 &&
        Boolean(comparisonSelection.topic.trim()) &&
        comparisonSelection.firstDocumentId !==
          comparisonSelection.secondDocumentId,
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
      {documentActionError && (
        <div className="alert alert-error documents-action-alert">
          {documentActionError}
        </div>
      )}

      <DocumentTable
        filteredDocuments={filteredDocuments}
        hasDocuments={documents.length > 0}
        isLoading={isLoadingDocuments}
        error={documentsError}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onRetry={() =>
          setDocumentsReloadKey((current) => current + 1)
        }
        onOpenSummary={openSummary}
        onOpenPreview={setPreviewDocument}
        onOpenUploadDialog={() => setIsUploadDialogOpen(true)}
        onUploadButtonDragEnter={handleUploadButtonDragEnter}
        onUploadButtonDragOver={handleUploadButtonDragOver}
        onUploadButtonDrop={handleUploadButtonDrop}
        onRenameDocument={openRenameDialog}
        onOpenExtraction={openExtraction}
        onReprocessDocument={reprocessFailedDocument}
        onDeleteDocument={openDeleteDialog}
      />

      {isUploadDialogOpen && (
        <UploadDocumentsDialog
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
          onClose={closeUploadDialog}
        />
      )}

      {renameDialogDocument && (
        <RenameDocumentDialog
          document={renameDialogDocument}
          error={renameDialogError}
          isSubmitting={isRenamingDocument}
          onCancel={closeRenameDialog}
          onSubmit={submitRenameDocument}
        />
      )}

      {duplicateDialog && (
        <DuplicateDocumentDialog
          duplicate={duplicateDialog}
          onAddDuplicate={() =>
            resolveDuplicateUploadDecision(true)
          }
          onSkip={() =>
            resolveDuplicateUploadDecision(false)
          }
        />
      )}

      {deleteDialogDocument && (
        <DeleteDocumentDialog
          document={deleteDialogDocument}
          error={deleteDialogError}
          isDeleting={isDeletingDocument}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDeleteDocument}
        />
      )}

      <SummaryPanel
        panelRef={summaryRef}
        summaryState={summaryState}
        document={summaryDocument}
        onLevelChange={handleLevelChange}
        onRegenerate={handleRegenerate}
      />

      <CrossDocumentComparison
        documents={documents}
        comparison={comparisonSelection}
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
        error={previewState.error}
        isLoading={previewState.isLoading}
        pages={previewState.pages}
        previewType={previewState.type}
        table={previewState.table}
        html={previewState.html}
        fileUrl={previewState.fileUrl}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}

export default DocumentsTab;
