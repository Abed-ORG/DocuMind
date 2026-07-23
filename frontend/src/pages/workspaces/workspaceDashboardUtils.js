export const defaultWorkspaceColor = "#4F46E5";

export const emptyWorkspace = {
  name: "",
  description: "",
  color: defaultWorkspaceColor,
};

const activityTimestampFormatter =
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function formatActivityTimestamp(value) {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No activity yet";
  }

  return activityTimestampFormatter.format(date);
}

export function getStatValue(value) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

export function normalizeWorkspace(workspace) {
  const activityTimestamp =
    workspace.lastActivity ??
    workspace.updatedAt ??
    workspace.createdAt;

  return {
    id: workspace.id ?? workspace._id,
    name: workspace.name,
    description: workspace.description ?? "",
    color:
      workspace.color ??
      defaultWorkspaceColor,
    documents: getStatValue(
      workspace.documentCount ??
        workspace.documents
    ),
    pages: getStatValue(
      workspace.pageCount ??
        workspace.pages
    ),
    lastActivity:
      formatActivityTimestamp(
        activityTimestamp
      ),
  };
}

export function buildWorkspacePayload(formData) {
  return {
    name: formData.name.trim(),
    description:
      formData.description.trim(),
    color: formData.color,
  };
}
