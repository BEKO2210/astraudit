import type { Severity } from "../../types/finding";

export function severityRank(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    case "info":
      return 1;
    default:
      return 0;
  }
}

export function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function severityClass(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "text-risk-critical border-risk-critical/40 bg-risk-critical/10";
    case "high":
      return "text-risk-high border-risk-high/40 bg-risk-high/10";
    case "medium":
      return "text-risk-medium border-risk-medium/40 bg-risk-medium/10";
    case "low":
      return "text-risk-low border-risk-low/40 bg-risk-low/10";
    case "info":
    default:
      return "text-risk-info border-risk-info/30 bg-risk-info/10";
  }
}
