import {
  AlertCircle,
  Eye,
  GitCompareArrows,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import documindHero from "../../../assets/documind-hero.png";
import { statusLabels } from "../workspaceData";
import { getFormatIcon } from "../workspaceUtils";

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
                          onClick={() => onOpenSummary(document)}
                        >
                          Summarize
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPreview(document)}
                        >
                          <Eye size={15} />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => onRenameDocument(document)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenExtraction(document)}
                        >
                          Extract
                        </button>
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => onDeleteDocument(document)}
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
    </>
  );
}

export default DocumentTable;
