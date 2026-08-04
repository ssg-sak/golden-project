export function resolvePolicyRiskThreshold(
  releaseThreshold?: number,
  dashboardThreshold?: number,
): number | undefined {
  return releaseThreshold ?? dashboardThreshold;
}
