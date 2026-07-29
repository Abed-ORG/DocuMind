import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Eye,
  GitCompareArrows,
  Loader2,
  Menu,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import documindHero from "../../../../assets/documind-hero.png";
import { statusLabels } from "../../data/workspaceData";
import { getFormatIcon } from "../../utils/workspaceUtils";

const processingStageLabels = {
  queued: "Queued",
  extracting: "Extracting",
  chunking: "Chunking",
  embedding: "Embedding",
};

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

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const buttonRect =
      buttonRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const menuWidth = 168;
    const estimatedMenuHeight =
      document.status === "failed" ? 244 : 206;
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
  }, [document.status]);

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
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onOpenExtraction)}
          >
            Extract
          </button>
          {document.status === "failed" && (
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                runAction(onReprocessDocument)
              }
            >
              <RotateCcw size={15} />
              Reprocess
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
  onRenameDocument,
  onOpenExtraction,
  onReprocessDocument,
  onDeleteDocument,
}) {
  return (
    <>
      <div className="document-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              onSearchTermChange(event.target.value)
            }
            placeholder="Search documents by name"
          />
        </label>

        <div className="document-toolbar-actions">
          <button
            className="primary-action"
            type="button"
            onClick={onOpenUploadDialog}
          >
            <UploadCloud size={17} />
            Add documents
          </button>

          <button className="secondary-action" type="button">
            <GitCompareArrows size={17} />
            Compare
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state compact document-table-state">
          <Loader2 className="spinner" size={34} />
          <h2>Loading documents</h2>
          <p>
            Fetching the latest files stored in this workspace.
          </p>
        </div>
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
              ? "No documents match your search."
              : "No documents yet. Upload your first file to get started."}
          </h2>
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
                      <button
                        className="document-name-button"
                        type="button"
                        onClick={() => onOpenPreview(document)}
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
      )}
    </>
  );
}

export default DocumentTable;
