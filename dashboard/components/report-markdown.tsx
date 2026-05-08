"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 border-b border-white/[0.06] pb-3 text-[18px] font-bold tracking-tight text-zinc-50">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-teal-400 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-[15px] font-semibold text-zinc-100">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[13px] leading-[1.7] text-zinc-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-1.5 pl-4 text-[13px] text-zinc-300 [&>li]:relative [&>li]:pl-3 [&>li::before]:absolute [&>li::before]:left-0 [&>li::before]:top-[0.6em] [&>li::before]:h-[5px] [&>li::before]:w-[5px] [&>li::before]:rounded-full [&>li::before]:bg-teal-500/40 [&>li::before]:content-['']">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[13px] text-zinc-300 marker:font-mono marker:text-[11px] marker:text-teal-500/60">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.65]">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-zinc-400">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-4 rounded-r-lg border-l-2 border-teal-500/40 bg-teal-500/[0.04] py-2 pl-4 pr-3 text-zinc-300">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words text-teal-400 underline decoration-teal-500/30 underline-offset-2 hover:text-teal-300"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={`${className ?? ""} block`}>{children}</code>;
    }
    return (
      <code className="rounded border border-amber-500/15 bg-amber-500/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] text-amber-400">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 max-h-[min(24rem,50vh)] overflow-x-auto overflow-y-auto rounded-lg border border-[#1e1e22] bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-teal-100/80">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-white/[0.06]" />,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-[#1e1e22]">
      <table className="w-full min-w-[20rem] border-collapse text-left text-[12px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-[#1e1e22] bg-white/[0.03]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.02]">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 font-mono text-[11.5px] text-zinc-300">{children}</td>
  ),
};

export function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="report-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
