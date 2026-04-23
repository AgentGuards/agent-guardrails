export interface Verdict {
  verdict: "allow" | "flag" | "pause";
  confidence: number;
  reasoning: string;
  signals: string[];
}
