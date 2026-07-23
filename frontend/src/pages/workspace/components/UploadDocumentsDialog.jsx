import {
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

import DocumentUpload from "./DocumentUpload";

const closeAnimationDurationMs = 180;

function UploadDocumentsDialog({
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
  onClose,
}) {
  const [isClosing, setIsClosing] =
    useState(false);
  const closeTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  function handleClose() {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(
      onClose,
      closeAnimationDurationMs
    );
  }

  return (
    <div
      className={
        isClosing
          ? "modal-backdrop upload-modal-backdrop is-closing"
          : "modal-backdrop upload-modal-backdrop"
      }
      role="presentation"
    >
      <section
        className="workspace-modal upload-document-modal"
        aria-modal="true"
        role="dialog"
        aria-labelledby="upload-document-title"
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">Upload</p>
            <h2 id="upload-document-title">
              Add documents
            </h2>
          </div>

          <button
            className="icon-button upload-modal-close"
            type="button"
            aria-label="Close upload dialog"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </header>

        <DocumentUpload
          isUploadingDocument={isUploadingDocument}
          isDraggingDocument={isDraggingDocument}
          uploadError={uploadError}
          uploadQueue={uploadQueue}
          onFileChange={onFileChange}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClearMessages={onClearMessages}
          onDismissMessage={onDismissMessage}
        />
      </section>
    </div>
  );
}

export default UploadDocumentsDialog;
