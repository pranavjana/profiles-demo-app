/**
 * TinyFish Agent API client — async, with a live browser feed.
 *
 * TinyFish (https://tinyfish.ai) turns the live web into an API: you give it a
 * URL and a natural-language goal, and a real browser navigates, clicks, fills
 * forms, and extracts structured data for you.
 *
 * Two features this starter showcases:
 *
 *  1. **Browser Context Profiles** — persistent, logged-in browser state you set
 *     up once and reuse on every run via `use_profile`. That lets the agent work
 *     on sites behind a login without signing in from scratch each time.
 *     Docs: https://docs.tinyfish.ai/agent-api/browser-context-profiles
 *
 *  2. **Live browser preview** — every run exposes a `streaming_url`, a live feed
 *     of the browser you can drop straight into an iframe and watch.
 *     Docs: https://docs.tinyfish.ai/live-preview
 *
 * To get the live feed we can't use the blocking `/run` endpoint (it only
 * returns the final result). Instead we start the run with `/run-async`, then
 * poll `GET /v1/runs/{id}` — that gives us the `streaming_url` within a couple
 * of seconds and the final `result` once the run completes. `streamWebAgent`
 * wraps that whole lifecycle as an async generator so the chat tool can stream
 * each phase (starting → running → done) to the UI as it happens.
 */

const TINYFISH_BASE = "https://agent.tinyfish.ai";
const RUN_ASYNC_URL = `${TINYFISH_BASE}/v1/automation/run-async`;

/** How often to poll the run, and how long to wait before giving up. */
const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 180_000;

/** Options accepted by {@link streamWebAgent}. */
export interface WebAgentOptions {
  /** The page the agent should start on, e.g. `https://news.ycombinator.com`. */
  url: string;
  /** Plain-English instruction describing what to do and what to return. */
  goal: string;
  /**
   * Reuse a saved Browser Context Profile (logged-in state). When true and no
   * `profileId` is given, TinyFish uses your account's default profile.
   */
  useProfile?: boolean;
  /** Target a specific profile by id. Requires `useProfile: true`. */
  profileId?: string;
}

/** Lifecycle phases we surface to the UI. */
export type WebAgentPhase = "starting" | "running" | "done" | "error";

/**
 * A single update yielded as the run progresses. Each one replaces the tool's
 * output in the UI; the *last* one yielded is what the model sees as the result.
 */
export interface WebAgentUpdate {
  phase: WebAgentPhase;
  url: string;
  goal: string;
  usedProfile: boolean;
  profileId?: string;
  /** TinyFish run id, once the run has been created. */
  runId?: string;
  /** Live browser feed — embeddable in an iframe while the run is active. */
  streamingUrl?: string;
  /** TinyFish run status: PENDING | RUNNING | COMPLETED | FAILED | CANCELLED. */
  status?: string;
  /** The agent's answer — object, list, or string — once the run completes. */
  result?: unknown;
  /** Presigned recording URL, available after completion (expires quickly). */
  videoUrl?: string;
  /** Human-readable error message if something went wrong. */
  error?: string;
}

/** Minimal shape of the TinyFish run object we read while polling. */
interface RunObject {
  run_id?: string;
  status?: string;
  result?: unknown;
  streaming_url?: string | null;
  video_url?: string | null;
  error?: { message?: string } | null;
}

function requireApiKey(): string {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TINYFISH_API_KEY is not set. Add it to .env.local — get a key at https://agent.tinyfish.ai/api-keys",
    );
  }
  return apiKey;
}

/** Kick off an asynchronous run and return its id. */
async function startRun(
  apiKey: string,
  options: WebAgentOptions,
): Promise<string> {
  const { url, goal, useProfile = true, profileId } = options;

  const response = await fetch(RUN_ASYNC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      url,
      goal,
      // `use_profile` is the key that unlocks saved logged-in browser state.
      use_profile: useProfile,
      ...(useProfile && profileId ? { profile_id: profileId } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `TinyFish run-async failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as { run_id?: string; id?: string };
  const runId = data.run_id ?? data.id;
  if (!runId) throw new Error("TinyFish did not return a run id.");
  return runId;
}

/** Fetch the current state of a run (screenshots/html omitted to stay light). */
async function getRun(apiKey: string, runId: string): Promise<RunObject> {
  const response = await fetch(
    `${TINYFISH_BASE}/v1/runs/${runId}?screenshots=none&html=none`,
    { headers: { "X-API-Key": apiKey } },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `TinyFish get-run failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }
  return (await response.json()) as RunObject;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

/**
 * Run a web automation and stream its progress.
 *
 * Yields a `starting` update immediately, a `running` update as soon as the live
 * `streamingUrl` is available (so the UI can show the browser), and finally a
 * `done` (or `error`) update carrying the extracted result.
 */
export async function* streamWebAgent(
  options: WebAgentOptions,
): AsyncGenerator<WebAgentUpdate> {
  const apiKey = requireApiKey();
  const { url, goal, useProfile = true, profileId } = options;

  // Fields common to every update, so the UI always has context to render.
  const base = { url, goal, usedProfile: useProfile, profileId };

  yield { ...base, phase: "starting" };

  const runId = await startRun(apiKey, options);

  let streamingUrl: string | undefined;
  let announcedRunning = false;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (true) {
    const run = await getRun(apiKey, runId);
    const status = run.status ?? "RUNNING";

    if (run.streaming_url) streamingUrl = run.streaming_url;

    // Surface the live view as soon as it appears (and only once).
    if (!announcedRunning && streamingUrl) {
      announcedRunning = true;
      yield { ...base, phase: "running", runId, status, streamingUrl };
    }

    if (TERMINAL.has(status)) {
      if (status === "COMPLETED") {
        // Final yield — this object is what the model receives as the result.
        yield {
          ...base,
          phase: "done",
          runId,
          status,
          streamingUrl,
          result: run.result,
          videoUrl: run.video_url ?? undefined,
        };
      } else {
        yield {
          ...base,
          phase: "error",
          runId,
          status,
          streamingUrl,
          error:
            run.error?.message ?? `Run ended with status ${status}.`,
        };
      }
      return;
    }

    if (Date.now() > deadline) {
      yield {
        ...base,
        phase: "error",
        runId,
        status,
        streamingUrl,
        error: "Timed out waiting for the web agent to finish.",
      };
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }
}
