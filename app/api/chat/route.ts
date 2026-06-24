/**
 * Chat endpoint.
 *
 * Receives the conversation from the `useChat` hook, streams a model response
 * back token-by-token, and exposes a single tool — `browseWeb` — that lets the
 * model dispatch a TinyFish web agent. When the agent uses a saved Browser
 * Context Profile, it operates with logged-in browser state.
 */
import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { CHAT_MODEL, openrouter } from "@/lib/openrouter";
import { streamWebAgent } from "@/lib/tinyfish";

// Stream for up to 5 minutes — the web agent can take a while to finish.
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a helpful, concise assistant embedded in a demo app.

You have one tool, "browseWeb", backed by the TinyFish web agent. It drives a
real browser to navigate, click, fill forms, and extract data from live websites.

Use browseWeb when the user asks about the current state of a specific website,
or needs an action performed on a page (checking a dashboard, reading a profile,
extracting listings, etc.). Write a precise goal: name the exact fields to return
and the desired format.

The tool can reuse a saved "browser profile" — persistent logged-in state — by
running with useProfile enabled. Mention when a result came from a logged-in
profile. After a tool result, summarize the findings clearly for the user.

For general questions that don't need a live website, just answer directly.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openrouter(CHAT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    // Allow the model to call the tool and then continue with a written answer.
    stopWhen: stepCountIs(5),
    tools: {
      browseWeb: tool({
        description:
          "Run a TinyFish web agent on a live website. It opens a real browser, " +
          "navigates to the URL, performs the goal, and returns the result. Can " +
          "reuse a saved browser profile (logged-in state) when useProfile is true.",
        inputSchema: z.object({
          url: z
            .string()
            .url()
            .describe("The page to start on, e.g. https://news.ycombinator.com"),
          goal: z
            .string()
            .describe(
              "Precise, plain-English instruction. Name the exact fields to " +
                "extract and the format to return them in.",
            ),
          useProfile: z
            .boolean()
            .default(true)
            .describe(
              "Reuse the saved browser profile (logged-in state). Keep true to " +
                "showcase authenticated runs; set false for a fresh anonymous browser.",
            ),
          profileId: z
            .string()
            .optional()
            .describe("Optional id to target a specific saved profile."),
        }),
        // `execute` returns an async generator. The AI SDK streams each yielded
        // value to the UI as a preliminary tool output (so the live browser feed
        // shows up mid-run), and feeds the *final* yield back to the model as the
        // result it summarizes. See lib/tinyfish.ts for the run lifecycle.
        execute: ({ url, goal, useProfile, profileId }) =>
          streamWebAgent({ url, goal, useProfile, profileId }),
      }),
    },
  });

  // Convert the stream into the protocol the `useChat` hook understands.
  return result.toUIMessageStreamResponse();
}
