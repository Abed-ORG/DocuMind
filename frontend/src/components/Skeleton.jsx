function SkeletonBlock({
  className = "",
}) {
  return (
    <span
      className={`skeleton-block ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

function MetricStripSkeleton() {
  return (
    <div
      className="metric-strip skeleton-metric-strip"
      aria-label="Loading dashboard metrics"
    >
      {[0, 1, 2].map((item) => (
        <article key={item}>
          <SkeletonBlock className="skeleton-icon" />
          <SkeletonBlock className="skeleton-number" />
          <SkeletonBlock className="skeleton-line short" />
        </article>
      ))}
    </div>
  );
}

function WorkspaceCardSkeleton() {
  return (
    <article
      className="workspace-card workspace-card-skeleton"
      aria-hidden="true"
    >
      <div className="workspace-card-top">
        <SkeletonBlock className="skeleton-dot" />
        <div className="workspace-card-actions">
          <SkeletonBlock className="skeleton-button" />
          <SkeletonBlock className="skeleton-button" />
        </div>
      </div>
      <div className="workspace-card-link">
        <SkeletonBlock className="skeleton-heading" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line medium" />
      </div>
      <div className="workspace-stats skeleton-stats">
        {[0, 1, 2].map((item) => (
          <div key={item}>
            <SkeletonBlock className="skeleton-line tiny" />
            <SkeletonBlock className="skeleton-line tiny" />
          </div>
        ))}
      </div>
    </article>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-skeleton"
      aria-label="Loading dashboard"
    >
      <MetricStripSkeleton />
      <div className="workspace-grid">
        {[0, 1, 2, 3].map((item) => (
          <WorkspaceCardSkeleton key={item} />
        ))}
      </div>
    </div>
  );
}

export function WorkspaceContentSkeleton() {
  return (
    <section
      className="workspace-content-skeleton"
      aria-label="Loading workspace"
    >
      <SkeletonBlock className="skeleton-heading wide" />
      <div className="workspace-panel-skeleton">
        <SkeletonBlock className="skeleton-line medium" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line short" />
      </div>
      <div className="workspace-table-skeleton">
        {[0, 1, 2, 3].map((item) => (
          <div key={item}>
            <SkeletonBlock className="skeleton-icon" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line medium" />
            <SkeletonBlock className="skeleton-line short" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DocumentTableSkeleton() {
  return (
    <div
      className="document-table-wrap document-table-skeleton"
      aria-label="Loading documents"
    >
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
          {[0, 1, 2, 3, 4].map((row) => (
            <tr key={row}>
              <td>
                <div className="document-name-cell">
                  <SkeletonBlock className="skeleton-icon" />
                  <SkeletonBlock className="skeleton-line" />
                </div>
              </td>
              <td><SkeletonBlock className="skeleton-line tiny" /></td>
              <td><SkeletonBlock className="skeleton-line tiny" /></td>
              <td><SkeletonBlock className="skeleton-line short" /></td>
              <td><SkeletonBlock className="skeleton-line medium" /></td>
              <td><SkeletonBlock className="skeleton-badge" /></td>
              <td><SkeletonBlock className="skeleton-button" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div
      className="conversation-list-skeleton"
      aria-label="Loading conversations"
    >
      {[0, 1, 2, 3].map((item) => (
        <div className="conversation-item-skeleton" key={item}>
          <SkeletonBlock className="skeleton-line medium" />
          <SkeletonBlock className="skeleton-line tiny" />
        </div>
      ))}
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div
      className="chat-message-skeleton"
      aria-label="Loading messages"
    >
      <div className="message-bubble assistant skeleton-message">
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line medium" />
      </div>
      <div className="message-bubble user skeleton-message">
        <SkeletonBlock className="skeleton-line medium" />
      </div>
      <div className="message-bubble assistant skeleton-message">
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line short" />
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div
      className="preview-skeleton"
      aria-label="Loading document preview"
    >
      <SkeletonBlock className="skeleton-heading wide" />
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <SkeletonBlock
          key={item}
          className={
            item % 3 === 2
              ? "skeleton-line medium"
              : "skeleton-line"
          }
        />
      ))}
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div
      className="summary-skeleton"
      aria-label="Generating summary"
    >
      <SkeletonBlock className="skeleton-heading" />
      <SkeletonBlock className="skeleton-line" />
      <SkeletonBlock className="skeleton-line" />
      <SkeletonBlock className="skeleton-line medium" />
    </div>
  );
}

export function AuthGateSkeleton() {
  return (
    <section
      className="page auth-gate-skeleton"
      aria-label="Checking session"
    >
      <div>
        <SkeletonBlock className="skeleton-heading wide" />
        <SkeletonBlock className="skeleton-line" />
        <SkeletonBlock className="skeleton-line medium" />
      </div>
    </section>
  );
}
