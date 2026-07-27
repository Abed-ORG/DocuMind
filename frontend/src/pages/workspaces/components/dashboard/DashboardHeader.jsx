import { FolderPlus } from "lucide-react";

function DashboardHeader({
  user,
  isLoading,
  onCreateWorkspace,
}) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>
          Welcome
          {user?.firstName
            ? `, ${user.firstName}`
            : ""}
        </h1>
        <p>
          Review active document workspaces, processing volume, and
          recent activity.
        </p>
      </div>

      <button
        className="primary-action"
        type="button"
        disabled={isLoading}
        onClick={onCreateWorkspace}
      >
        <FolderPlus size={18} />
        Create Workspace
      </button>
    </header>
  );
}

export default DashboardHeader;
