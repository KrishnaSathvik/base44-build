export type Severity = "critical" | "high" | "medium" | "low";
export type Reproducibility = "confirmed" | "likely" | "unknown";

export interface PriorityInput {
  severity: Severity;
  reportCount: number;
  reproducibility: Reproducibility;
  reportTimestamps: string[];
  lastSeenAt: string;
  coreWorkflowBlocked: boolean;
  reopened: boolean;
  now?: Date;
}

export interface PriorityResult {
  score: number;
  explanation: string[];
}

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 50,
  high: 30,
  medium: 15,
  low: 5,
};

const REPRODUCIBILITY_WEIGHTS: Record<Reproducibility, number> = {
  confirmed: 10,
  likely: 5,
  unknown: 0,
};

export function severityWeight(severity: Severity): number {
  return SEVERITY_WEIGHTS[severity];
}

export function hasRapidSpike(timestamps: string[]): boolean {
  const times = timestamps
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  for (let index = 0; index < times.length; index += 1) {
    if (times[index + 2] !== undefined && times[index + 2] - times[index] <= 60 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

export function computePriority(input: PriorityInput): PriorityResult {
  const explanation: string[] = [];
  let total = 0;
  const add = (label: string, value: number) => {
    if (value <= 0) return;
    total += value;
    explanation.push(`${label} (+${value})`);
  };

  add(`${input.severity[0].toUpperCase()}${input.severity.slice(1)} severity`, severityWeight(input.severity));
  add(`${input.reportCount} report${input.reportCount === 1 ? "" : "s"}`, Math.min(Math.max(input.reportCount - 1, 0) * 5, 25));
  add(`${input.reproducibility[0].toUpperCase()}${input.reproducibility.slice(1)} reproducibility`, REPRODUCIBILITY_WEIGHTS[input.reproducibility]);
  add("Rapid spike", hasRapidSpike(input.reportTimestamps) ? 8 : 0);

  const now = input.now ?? new Date();
  const lastSeen = new Date(input.lastSeenAt).getTime();
  add("Recent activity", Number.isFinite(lastSeen) && now.getTime() - lastSeen <= 24 * 60 * 60 * 1000 ? 5 : 0);
  add("Core workflow blocked", input.coreWorkflowBlocked ? 15 : 0);
  add("Previously resolved issue reopened", input.reopened ? 12 : 0);

  return { score: Math.min(total, 100), explanation };
}

export function computeInitialPriority(severity: Severity, reportCount = 1): number {
  return computePriority({
    severity,
    reportCount,
    reproducibility: "unknown",
    reportTimestamps: [],
    lastSeenAt: new Date(0).toISOString(),
    coreWorkflowBlocked: false,
    reopened: false,
  }).score;
}
