import {
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import { getUploadStatusLabel } from "../workspaceUtils";

function DocumentUpload({
  isUploadingDocument,
  isDraggingDocument,
  uploadError,
  uploadQueue,
  onFileChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onClearMessages,
  onDismissMessage,
}) {
  const uploadZoneClassName = [
    "upload-zone",
    isUploadingDocument ? "is-uploading" : "",
    isDraggingDocument ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <label
        className={uploadZoneClassName}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          multiple
          disabled={isUploadingDocument}
          onChange={onFileChange}
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

      {uploadQueue.length > 0 && (
        <div className="upload-progress-panel" aria-live="polite">
          <div className="upload-progress-header">
            <strong>Upload messages</strong>
            <button
              type="button"
              onClick={onClearMessages}
            >
              Clear all
            </button>
          </div>

          <div className="upload-progress-list">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className={`upload-progress-item is-${item.status}`}
              >
                <div className="upload-progress-copy">
                  <strong>{item.name}</strong>
                  <span>
                    {item.status === "failed"
                      ? item.error
                      : `${item.size} - ${getUploadStatusLabel(
                          item.status
                        )}`}
                  </span>
                </div>

                <div className="upload-progress-actions">
                  <strong className="upload-progress-value">
                    {item.status === "failed"
                      ? "Failed"
                      : `${item.progress}%`}
                  </strong>

                  <button
                    className="upload-dismiss-button"
                    type="button"
                    aria-label={`Dismiss ${item.name} upload message`}
                    title="Dismiss upload message"
                    onClick={() => onDismissMessage(item.id)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="upload-progress-track">
                  <span
                    style={{
                      width: `${item.progress}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentUpload;
