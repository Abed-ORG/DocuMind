import {
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

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

export default WorkspaceStatusPanel;
