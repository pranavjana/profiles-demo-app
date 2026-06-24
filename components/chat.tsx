"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Message } from "./message";
import { ChatInput } from "./chat-input";

/*
 * The chat experience. `useChat` (Vercel AI SDK) owns the message list and the
 * streaming connection to `/api/chat`; we keep the text-box value in local
 * state and call `sendMessage` to submit.
 *
 * Smooth streaming comes for free: the SDK appends tokens to the active
 * assistant message as they arrive, and React re-renders only what changed.
 */

export function Chat() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  // Keep the latest message in view as content streams in.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4">
          {isEmpty ? (
            <EmptyState />
          ) : (
            <div className="space-y-6 py-6">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isStreaming={
                    isStreaming && message.id === messages[messages.length - 1].id
                  }
                />
              ))}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  Something went wrong. Check that your API keys are set in
                  <code className="mx-1">.env.local</code>and try again.
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <ChatInput
            input={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            onStop={stop}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}

/** Centered welcome screen. */
function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center">
        <Image
          src="/tinyfish.png"
          alt="TinyFish"
          width={56}
          height={56}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold">How can I help?</h1>
      <p className="text-muted mt-2 max-w-md text-sm">
        Ask anything, or have the TinyFish web agent act on a live site — it can
        reuse a saved browser profile to work behind a login.
      </p>
    </div>
  );
}
