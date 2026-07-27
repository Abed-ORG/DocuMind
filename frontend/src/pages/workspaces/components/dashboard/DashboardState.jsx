import {
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

import documindHero from "../../../../assets/documind-hero.png";

function DashboardState({
  type,
  error,
  onRetry,
  onCreateWorkspace,
}) {
  if (type === "loading") {
    return (
      <div className="empty-state dashboard-state">
        <Loader2 className="spinner" size={34} />
        <h2>Loading workspaces</h2>
        <p>
          Fetching your workspace list from the API.
        </p>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="empty-state dashboard-state">
        <AlertCircle size={34} />
        <h2>Unable to load workspaces</h2>
        <p>{error}</p>
        <button
          className="secondary-action"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <img src={documindHero} alt="" />
      <h2>Create your first workspace</h2>
      <p>
        Workspaces keep related documents, chats, comparisons, and
        analytics together.
      </p>
      <button
        className="primary-action"
        type="button"
        onClick={onCreateWorkspace}
      >
        <Plus size={18} />
        Create Workspace
      </button>
    </div>
  );
}

export default DashboardState;
