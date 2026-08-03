function revisionLabel(version?: string | null): string {
  const revision = version?.match(/-r(\d+)$/i)?.[1];
  return revision ? `${Number(revision)}차 ` : '';
}

function calendarDateLabel(value?: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? `${match[1]}.${match[2]}.${match[3]}` : null;
}

export function formatPolicyReleaseLabel(
  releasedAt?: string,
  version?: string | null,
): string {
  const revision = revisionLabel(version);
  const releasedDateLabel = calendarDateLabel(releasedAt);
  if (releasedDateLabel) return `${releasedDateLabel} ${revision}검증본`;

  const versionDateLabel = calendarDateLabel(version);
  if (versionDateLabel) return `${versionDateLabel} ${revision}검증본`;
  return revision ? `${revision}검증본` : '검증된 분석본';
}
