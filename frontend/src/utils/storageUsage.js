const defaultStorageLimitBytes =
  100 * 1024 * 1024;

function formatStorageBytes(value) {
  const bytes = Number(value) || 0;

  if (bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(bytes / 1024)
    )} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getStorageUsage(user) {
  const usedBytes = Math.max(
    0,
    Number(user?.storageUsedBytes) || 0
  );
  const limitBytes =
    Number(user?.storageLimitBytes) ||
    defaultStorageLimitBytes;
  const percent =
    limitBytes > 0
      ? Math.min(
          100,
          (usedBytes / limitBytes) * 100
        )
      : 0;

  return {
    label: `${formatStorageBytes(
      usedBytes
    )} / ${formatStorageBytes(limitBytes)}`,
    percent,
  };
}
