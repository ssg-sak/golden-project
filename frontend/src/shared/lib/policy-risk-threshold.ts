export function resolvePolicyRiskThreshold(
  releaseThreshold?: number,
  dashboardThreshold?: number,
): number | undefined {
  return releaseThreshold ?? dashboardThreshold;
}

export function clampPolicyRiskThreshold(
  threshold: number,
  minimum: number,
  maximum: number,
  useDynamicDashboard: boolean,
): number {
  if (useDynamicDashboard || threshold === 0) return threshold;
  return Math.min(maximum, Math.max(minimum, threshold));
}
