function revisionLabel(version?: string | null): string {
  const revision = version?.match(/-r(\d+)$/i)?.[1];
  return revision ? `${Number(revision)}차 ` : '';
}

export function formatPolicyReleaseLabel(
  releasedAt?: string,
  version?: string | null,
): string {
  const revision = revisionLabel(version);
  const releasedDate = releasedAt ? new Date(releasedAt) : null;
  if (releasedDate && !Number.isNaN(releasedDate.getTime())) {
    const dateLabel = `${releasedDate.getFullYear()}.${String(releasedDate.getMonth() + 1).padStart(2, '0')}.${String(releasedDate.getDate()).padStart(2, '0')}`;
    return `${dateLabel} ${revision}검증본`;
  }

  const versionDate = version?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (versionDate) {
    return `${versionDate[1]}.${versionDate[2]}.${versionDate[3]} ${revision}검증본`;
  }
  return revision ? `${revision}검증본` : '검증된 분석본';
}
