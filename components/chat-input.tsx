"use client";

import { useRef, type FormEvent } from "react";
import { ArrowUp, Square } from "lucide-react";

/*
 * The message composer: an auto-growing textarea with a send/stop button.
 *
 * It's a controlled component — the parent owns the input value and the submit
 * handler — so all chat state lives in one place (the `Chat` component).
 * Enter sends; Shift+Enter inserts a newline.
 */
export function ChatInput({
  input,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
}: {
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isStreaming || !input.trim()) return;
    onSubmit();
    // Reset the textarea height after sending.
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  // Grow the textarea with its content, up to a sensible max height.
  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="border-border bg-background focus-within:border-muted flex items-center gap-2 rounded-3xl border px-4 py-3 shadow-sm transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            onChange(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter makes a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          placeholder="Message the assistant…"
          className="placeholder:text-muted max-h-[200px] flex-1 resize-none bg-transparent text-[15px] leading-6 outline-none"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
