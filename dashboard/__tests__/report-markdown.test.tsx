import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportMarkdown } from "@/components/report-markdown";

const SAMPLE = `## Summary

- Item one
- Item two

\`\`\`ts
const x = 1;
\`\`\`

[Example](https://example.com)`;

describe("ReportMarkdown", () => {
  it("renders headings, list, code fence, and safe external links", () => {
    render(<ReportMarkdown markdown={SAMPLE} />);
    expect(screen.getByRole("heading", { name: /summary/i })).toBeTruthy();
    expect(screen.getByText("Item one")).toBeTruthy();
    expect(screen.getByText(/const x = 1/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /example/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
