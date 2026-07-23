import { Link } from "react-router";
import {
  Edit3,
  Trash2,
} from "lucide-react";

function WorkspaceCard({
  workspace,
  onEdit,
  onDelete,
}) {
  return (
    <article className="workspace-card">
      <div className="workspace-card-top">
        <span
          className="workspace-color-dot"
          style={{ background: workspace.color }}
        />
        <div className="workspace-card-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={`Edit ${workspace.name}`}
            onClick={() => onEdit(workspace)}
          >
            <Edit3 size={17} />
          </button>
          <button
            className="icon-button danger-icon-button"
            type="button"
            aria-label={`Delete ${workspace.name}`}
            onClick={() => onDelete(workspace)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <Link
        className="workspace-card-link"
        to={`/workspace/${workspace.id}/documents`}
      >
        <h2>{workspace.name}</h2>
        <p>
          {workspace.description ||
            "No description yet."}
        </p>
      </Link>

      <dl className="workspace-stats">
        <div>
          <dt>Documents</dt>
          <dd>{workspace.documents}</dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>{workspace.pages.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>{workspace.lastActivity}</dd>
        </div>
      </dl>
    </article>
  );
}

export default WorkspaceCard;
