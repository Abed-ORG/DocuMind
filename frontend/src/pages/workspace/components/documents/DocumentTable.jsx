import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  FileText,
  Menu,
  PencilLine,
  RotateCcw,
  Search,
  TextSelect,
  Trash2,
  UploadCloud,
} from "lucide-react";

import documindHero from "../../../../assets/documind-hero.png";
import { DocumentTableSkeleton } from "../../../../components/Skeleton";
import { statusLabels } from "../../data/workspaceData";
import { getFormatIcon } from "../../utils/workspaceUtils";

const processingStageLabels = {
  queued: "Queued",
  extracting: "Extracting",
  chunking: "Chunking",
  embedding: "Embedding",
};

const staleProcessingDocumentMs =
  5 * 60 * 1000;
const documentsPerPage = 8;
const defaultFilters = {
  format: "all",
  status: "all",
  date: "all",
};

const dateFilterOptions = [
  {
    value: "all",
    label: "Any date",
  },
  {
    value: "today",
    label: "Today",
  },
  {
    value: "7-days",
    label: "Last 7 days",
  },
  {
    value: "30-days",
    label: "Last 30 days",
  },
];

function getDateFilterStart(value) {
  const now = new Date();

  if (value === "today") {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  if (value === "7-days") {
    return new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );
  }

  if (value === "30-days") {
    return new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );
  }

  return null;
}

function documentMatchesDateFilter(document, dateFilter) {
  const startDate = getDateFilterStart(dateFilter);

  if (!startDate) {
    return true;
  }

  const uploadedAt = new Date(
    document.uploadedAtDate ?? document.updatedAt
  ).getTime();

  return (
    Number.isFinite(uploadedAt) &&
    uploadedAt >= startDate.getTime()
  );
}

function getFilterCount(filters) {
  return Object.values(filters).filter(
    (value) => value !== "all"
  ).length;
}

function isStaleProcessingDocument(document) {
  if (document.status !== "processing") {
    return false;
  }

  const updatedAt = new Date(
    document.updatedAt
  ).getTime();

  return (
    Number.isFinite(updatedAt) &&
    Date.now() - updatedAt >
      staleProcessingDocumentMs
  );
}

function getDocumentStatusLabel(document) {
  if (document.status !== "processing") {
    return (
      statusLabels[document.status] ??
      document.status
    );
  }

  const stageLabel =
    processingStageLabels[
      document.processingStage
    ] ?? "Processing";
  const progress = Number.isFinite(
    document.processingProgress
  )
    ? Math.round(document.processingProgress)
    : 0;

  return `${stageLabel} ${progress}%`;
}

function DocumentActionsMenu({
  document,
  onOpenSummary,
  onOpenPreview,
  onRenameDocument,
  onOpenExtraction,
  onReprocessDocument,
  onDeleteDocument,
}) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [menuPosition, setMenuPosition] =
    useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const canReprocess =
    document.status === "failed" ||
    isStaleProcessingDocument(document);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const buttonRect =
      buttonRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = 168;
    const estimatedMenuHeight =
      canReprocess ? 244 : 206;
    const gap = 8;

    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(
        viewportPadding,
        buttonRect.right - menuWidth
      )
    );

    const preferredTop = buttonRect.bottom + gap;
    const top =
      preferredTop + estimatedMenuHeight >
      window.innerHeight - viewportPadding
        ? Math.max(
            viewportPadding,
            buttonRect.top - estimatedMenuHeight - gap
          )
        : preferredTop;

    setMenuPosition({ top, left });
  }, [canReprocess]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updateMenuPosition();

    function handleDocumentClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleViewportChange() {
      setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.document.addEventListener(
      "mousedown",
      handleDocumentClick
    );
    window.document.addEventListener(
      "keydown",
      handleKeyDown
    );
    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );
    window.addEventListener(
      "resize",
      handleViewportChange
    );

    return () => {
      window.document.removeEventListener(
        "mousedown",
        handleDocumentClick
      );
      window.document.removeEventListener(
        "keydown",
        handleKeyDown
      );
      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
      window.removeEventListener(
        "resize",
        handleViewportChange
      );
    };
  }, [isOpen, updateMenuPosition]);

  function runAction(action) {
    action(document);
    setIsOpen(false);
  }

  function toggleMenu() {
    if (!isOpen) {
      updateMenuPosition();
    }

    setIsOpen((current) => !current);
  }

  return (
    <div
      className="document-actions-menu-wrap"
      ref={menuRef}
    >
      <button
        ref={buttonRef}
        className="document-actions-toggle"
        type="button"
        aria-label={`Open actions for ${document.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <Menu size={17} />
      </button>

      {isOpen && (
        <div
          className="document-actions-menu"
          role="menu"
          style={menuPosition}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenSummary)}
          >
            <FileText size={15} />
            Summarize
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenPreview)}
          >
            <Eye size={15} />
            Preview
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onRenameDocument)}
          >
            <PencilLine size={15} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenExtraction)}
          >
            <TextSelect size={15} />
            Extract
          </button>
          {canReprocess && (
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                runAction(onReprocessDocument)
              }
            >
              <RotateCcw size={15} />
              {document.status === "processing"
                ? "Restart processing"
                : "Reprocess"}
            </button>
          )}
          <button
            className="danger-action"
            type="button"
            role="menuitem"
            onClick={() => runAction(onDeleteDocument)}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentTable({
  filteredDocuments,
  hasDocuments,
  isLoading,
  error,
  searchTerm,
  onSearchTermChange,
  onRetry,
  onOpenSummary,
  onOpenPreview,
  onOpenUploadDialog,
  onUploadButtonDragEnter,
  onUploadButtonDragOver,
  onUploadButtonDrop,
  onRenameDocument,
  onOpenExtraction,
  onReprocessDocument,
  onDeleteDocument,
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const activeFilterCount = getFilterCount(filters);

  const formatOptions = useMemo(
    () =>
      [
        ...new Set(
          filteredDocuments
            .map((document) => document.format)
            .filter(Boolean)
        ),
      ].sort(),
    [filteredDocuments]
  );

  const statusOptions = useMemo(
    () =>
      [
        ...new Set(
          filteredDocuments
            .map((document) => document.status)
            .filter(Boolean)
        ),
      ].sort(),
    [filteredDocuments]
  );

  const visibleDocuments = useMemo(
    () =>
      filteredDocuments.filter(
        (document) =>
          (filters.format === "all" ||
            document.format === filters.format) &&
          (filters.status === "all" ||
            document.status === filters.status) &&
          documentMatchesDateFilter(
            document,
            filters.date
          )
      ),
    [filteredDocuments, filters]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(
      visibleDocuments.length / documentsPerPage
    )
  );
  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );
  const paginatedDocuments = visibleDocuments.slice(
    (safeCurrentPage - 1) * documentsPerPage,
    safeCurrentPage * documentsPerPage
  );
  const firstVisibleDocumentIndex =
    visibleDocuments.length === 0
      ? 0
      : (safeCurrentPage - 1) * documentsPerPage + 1;
  const lastVisibleDocumentIndex = Math.min(
    safeCurrentPage * documentsPerPage,
    visibleDocuments.length
  );
  const hasActiveFilters = activeFilterCount > 0;

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setCurrentPage(1);
  }

  function clearSearchAndFilters() {
    onSearchTermChange("");
    clearFilters();
  }

  return (
    <>
      <div className="document-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setCurrentPage(1);
              onSearchTermChange(event.target.value);
            }}
            placeholder="Search documents by name"
          />
        </label>

        <div className="document-toolbar-actions">
          <button
            className={`secondary-action filter-action ${
              hasActiveFilters ? "active" : ""
            }`}
            type="button"
            onClick={() => setIsFilterDialogOpen(true)}
          >
            <Filter size={17} />
            Filters
            {hasActiveFilters && (
              <span>{activeFilterCount}</span>
            )}
          </button>
          <button
            className="primary-action"
            type="button"
            onClick={onOpenUploadDialog}
            onDragEnter={onUploadButtonDragEnter}
            onDragOver={onUploadButtonDragOver}
            onDrop={onUploadButtonDrop}
          >
            <UploadCloud size={17} />
            Add documents
          </button>
        </div>
      </div>

      {isLoading ? (
        <DocumentTableSkeleton />
      ) : error ? (
        <div className="empty-state compact document-table-state">
          <AlertCircle size={34} />
          <h2>Unable to load documents</h2>
          <p>{error}</p>
          <button
            className="secondary-action"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="empty-state compact">
          <img src={documindHero} alt="" />
          <h2>
            {hasDocuments
              ? "No documents match your search or filters."
              : "No documents yet. Upload your first file to get started."}
          </h2>
          {hasDocuments ? (
            <button
              className="secondary-action"
              type="button"
              onClick={clearSearchAndFilters}
            >
              Clear search and filters
            </button>
          ) : (
            <button
              className="primary-action"
              type="button"
              onClick={onOpenUploadDialog}
              onDragEnter={onUploadButtonDragEnter}
              onDragOver={onUploadButtonDragOver}
              onDrop={onUploadButtonDrop}
            >
              <UploadCloud size={17} />
              Upload document
            </button>
          )}
        </div>
      ) : (
        <>
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
                {paginatedDocuments.map((document) => {
                  const FormatIcon = getFormatIcon(
                    document.format
                  );

                  return (
                    <tr key={document.id}>
                      <td>
                        <button
                          className="document-name-button"
                          type="button"
                          onClick={() =>
                            onOpenPreview(document)
                          }
                          aria-label={`Preview ${document.name}`}
                        >
                          <span className="file-icon">
                            <FormatIcon size={18} />
                          </span>
                          <strong>{document.name}</strong>
                        </button>
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
                          title={
                            document.processingError ||
                            undefined
                          }
                        >
                          {getDocumentStatusLabel(document)}
                        </span>
                      </td>
                      <td className="document-actions-cell">
                        <DocumentActionsMenu
                          document={document}
                          onOpenSummary={onOpenSummary}
                          onOpenPreview={onOpenPreview}
                          onRenameDocument={onRenameDocument}
                          onOpenExtraction={onOpenExtraction}
                          onReprocessDocument={
                            onReprocessDocument
                          }
                          onDeleteDocument={onDeleteDocument}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="document-pagination">
            <span>
              Showing {firstVisibleDocumentIndex}-
              {lastVisibleDocumentIndex} of{" "}
              {visibleDocuments.length}
            </span>
            <div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
                disabled={safeCurrentPage === 1}
                aria-label="Previous documents page"
              >
                <ChevronLeft size={16} />
              </button>
              <strong>
                Page {safeCurrentPage} of {totalPages}
              </strong>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={safeCurrentPage === totalPages}
                aria-label="Next documents page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {isFilterDialogOpen && (
        <div
          className="filter-dialog-backdrop"
          role="presentation"
          onMouseDown={() =>
            setIsFilterDialogOpen(false)
          }
        >
          <section
            className="document-filter-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-filter-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">Filters</p>
                <h2 id="document-filter-title">
                  Filter documents
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setIsFilterDialogOpen(false)
                }
              >
                Close
              </button>
            </header>

            <div className="document-filter-grid">
              <label>
                <span>Document type</span>
                <select
                  value={filters.format}
                  onChange={(event) =>
                    updateFilter(
                      "format",
                      event.target.value
                    )
                  }
                >
                  <option value="all">All types</option>
                  {formatOptions.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Date uploaded</span>
                <select
                  value={filters.date}
                  onChange={(event) =>
                    updateFilter(
                      "date",
                      event.target.value
                    )
                  }
                >
                  {dateFilterOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter(
                      "status",
                      event.target.value
                    )
                  }
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status] ?? status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <footer>
              <button
                className="secondary-action"
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                Clear all filters
              </button>
              <button
                className="primary-action"
                type="button"
                onClick={() =>
                  setIsFilterDialogOpen(false)
                }
              >
                Apply filters
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export default DocumentTable;
