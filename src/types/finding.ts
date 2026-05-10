export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Confidence = "high" | "medium" | "low";

export type FindingCategory =
  | "documentation"
  | "structure"
  | "quality"
  | "security"
  | "maintenance"
  | "dx"
  | "ecosystem"
  | "ci";

export interface Finding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  description: string;
  evidence: string;
  recommendation: string;
  affectedFiles: string[];
  confidence: Confidence;
}
