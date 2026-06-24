"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
 * Markdown renderer for assistant messages. Assistant output is markdown, so we
 * render it with `react-markdown` (+ GFM for tables, strikethrough, task lists)
 * and a small set of Tailwind-styled elements that match the app's look.
 *
 * It's memoized so already-rendered text isn't re-parsed on every streamed
 * token — only the growing message re-renders.
 */

const components: Components = {
  // Paragraphs and spacing
  p: ({ children }) => <p className="leading-7 whitespace-pre-wrap">{children}</p>,
  // Headings
  h1: ({ children }) => (
    <h1 className="mt-2 mb-2 text-xl font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-2 mb-2 text-lg font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-base font-semibold">{children}</h3>
  ),
  // Lists
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-1 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  // Links open in a new tab
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent font-medium underline underline-offset-2"
    >
      {children}
    </a>
  ),
  // Inline code vs. fenced code blocks
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="font-mono text-sm">{children}</code>
      );
    }
    return (
      <code className="bg-surface-hover rounded px-1.5 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-hover my-2 overflow-x-auto rounded-lg p-3 text-sm">
      {children}
    </pre>
  ),
  // Tables (GFM)
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="border-border w-full border-collapse border text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-border bg-surface border px-3 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border border px-3 py-1.5">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-border text-muted border-l-2 pl-4 italic">
      {children}
    </blockquote>
  ),
};

function MarkdownImpl({ children }: { children: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
