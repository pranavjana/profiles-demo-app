"use client";

import type { UIMessage } from "ai";
import Image from "next/image";
import { Markdown } from "./markdown";
import { ToolInvocation, type ToolPart } from "./tool-invocation";

/*
 * Renders a single chat message. Messages are made of typed `parts` — text,
 * and tool calls like our `browseWeb` agent — which we map to the right UI.
 *
 * Layout:
 *  - User messages sit in a rounded bubble, right-aligned.
 *  - Assistant messages span the column, left-aligned, with a small avatar and
 *    markdown-rendered text.
 */
export function Message({
  message,
  isStreaming,
}: {
  message: UIMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-user-bubble max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap">
          {message.parts.map((part, i) =>
            part.type === "text" ? <span key={i}>{part.text}</span> : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Assistant avatar — the TinyFish mascot. */}
      <div className="border-border bg-surface flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border">
        <Image
          src="/tinyfish.png"
          alt="TinyFish agent"
          width={28}
          height={28}
          className="h-full w-full translate-x-[1.5px] object-contain p-0.5"
        />
      </div>

      <div className="animate-fade-in min-w-0 flex-1 pt-0.5">
        {message.parts.map((part, i) => {
          // Streamed assistant text, rendered as markdown.
          if (part.type === "text") {
            const isLastTextStreaming =
              isStreaming && i === lastTextIndex(message);
            return (
              <div
                key={i}
                className={isLastTextStreaming ? "streaming-caret" : undefined}
              >
                <Markdown>{part.text}</Markdown>
              </div>
            );
          }

          // The TinyFish web-agent tool call. AI SDK names tool parts
          // `tool-<toolName>`, so we match our `browseWeb` tool here.
          if (part.type === "tool-browseWeb") {
            return <ToolInvocation key={i} part={part as unknown as ToolPart} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

/** Index of the last text part, so only it shows the streaming caret. */
function lastTextIndex(message: UIMessage): number {
  let idx = -1;
  message.parts.forEach((p, i) => {
    if (p.type === "text") idx = i;
  });
  return idx;
}
