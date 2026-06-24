/**
 * OpenRouter provider configuration for the Vercel AI SDK.
 *
 * OpenRouter (https://openrouter.ai) is a single API that gives you access to
 * hundreds of models (Anthropic, OpenAI, Google, Meta, etc.) behind one key.
 * The `@openrouter/ai-sdk-provider` package wires it into the AI SDK so you can
 * use `streamText`, `generateText`, tools, and everything else as usual.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// The provider reads `OPENROUTER_API_KEY` from the environment automatically,
// but we pass it explicitly so a missing key fails loudly during local dev.
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/**
 * The model the chat uses. Any OpenRouter model slug works here — swap it for
 * `openai/gpt-4o`, `google/gemini-2.5-pro`, `meta-llama/llama-3.3-70b-instruct`,
 * etc. It must support tool calling for the TinyFish web agent tool to fire.
 *
 * Override it without touching code by setting `OPENROUTER_MODEL` in `.env.local`.
 */
export const CHAT_MODEL =
  process.env.OPENROUTER_MODEL ?? "openai/gpt-5.4-mini";
