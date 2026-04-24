"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-50">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-8 border-b border-zinc-800 pb-2 text-xl font-semibold text-zinc-100">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-medium text-zinc-200">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-relaxed text-zinc-300">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-zinc-300">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-zinc-600 pl-4 italic text-zinc-400">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words text-emerald-400 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-300"
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
      <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-sm text-emerald-200">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 max-h-[min(24rem,50vh)] overflow-x-auto overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-zinc-800" />,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-zinc-700">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-zinc-800">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 font-medium text-zinc-400">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-zinc-300">{children}</td>,
};

export function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="report-markdown max-w-3xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
