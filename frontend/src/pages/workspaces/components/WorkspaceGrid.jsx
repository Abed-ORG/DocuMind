import { Plus } from "lucide-react";

import WorkspaceCard from "./WorkspaceCard";

function WorkspaceGrid({
  workspaces,
  onCreateWorkspace,
  onEditWorkspace,
  onDeleteWorkspace,
}) {
  return (
    <div className="workspace-grid">
      <button
        className="create-workspace-card"
        type="button"
        onClick={onCreateWorkspace}
      >
        <span>
          <Plus size={24} />
        </span>
        <strong>Create Workspace</strong>
        <p>Start a new document collection.</p>
      </button>

      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onEdit={onEditWorkspace}
          onDelete={onDeleteWorkspace}
        />
      ))}
    </div>
  );
}

export default WorkspaceGrid;
