"use client";

import { useState } from "react";
import {
  Globe,
  Loader2,
  ChevronDown,
  ShieldCheck,
  CircleCheck,
  CircleAlert,
  Video,
} from "lucide-react";

/*
 * Renders a `browseWeb` tool call as a card with a **live browser feed**.
 *
 * The tool streams its progress (starting → running → done) as preliminary
 * outputs, so `part.output` updates in place as the run proceeds. The headline
 * of the demo is the live view: while the agent is running we embed its
 * `streamingUrl` in an iframe so you can literally watch the TinyFish browser
 * navigate, click, and extract — using your saved logged-in profile.
 *
 * We stay loose on the `part` shape so it survives SDK minor versions.
 */

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

type Phase = "starting" | "running" | "done" | "error";

interface WebAgentInput {
  url?: string;
  goal?: string;
  useProfile?: boolean;
  profileId?: string;
}

interface WebAgentOutput {
  phase?: Phase;
  url?: string;
  goal?: string;
  usedProfile?: boolean;
  profileId?: string;
  runId?: string;
  streamingUrl?: string;
  status?: string;
  result?: unknown;
  videoUrl?: string;
  error?: string;
}

export interface ToolPart {
  state: ToolState;
  input?: WebAgentInput;
  output?: WebAgentOutput;
  errorText?: string;
}

export function ToolInvocation({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(true);

  const input = part.input ?? {};
  const output = part.output ?? {};

  // Prefer the streamed output fields, falling back to the tool input.
  const phase: Phase = output.phase ?? "starting";
  const url = output.url ?? input.url;
  const goal = output.goal ?? input.goal;
  const usedProfile = output.usedProfile ?? input.useProfile ?? false;
  const profileId = output.profileId ?? input.profileId;
  const streamingUrl = output.streamingUrl;

  const isError = phase === "error" || part.state === "output-error";
  const isDone = phase === "done";
  const isRunning = !isDone && !isError;

  // Show the live browser while the run is active. Once it's done the stream
  // endpoint goes away, so we stop embedding it.
  const showLiveView = isRunning && Boolean(streamingUrl);
  const showSpinnerView = isRunning && !streamingUrl;

  return (
    <div className="border-border bg-surface my-3 overflow-hidden rounded-xl border">
      {/* Header — click to expand/collapse the details below the live view. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-surface-hover flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors"
      >
        <StatusIcon isRunning={isRunning} isError={isError} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {phase === "starting"
                ? "Starting web agent…"
                : phase === "running"
                  ? "Web agent is browsing…"
                  : isError
                    ? "Web agent failed"
                    : "Web agent finished"}
            </span>
            {usedProfile && (
              <span className="bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                <ShieldCheck className="h-3 w-3" />
                Browser profile
              </span>
            )}
          </div>
          {url && (
            <div className="text-muted mt-0.5 flex items-center gap-1.5 truncate text-xs">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{url}</span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`text-muted h-4 w-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Live browser feed — the centerpiece. Always visible while running. */}
      {(showLiveView || showSpinnerView) && (
        <div className="border-border border-t p-3.5">
          <div className="bg-foreground/[0.03] relative aspect-video w-full overflow-hidden rounded-lg">
            {showLiveView ? (
              <>
                <iframe
                  src={streamingUrl}
                  title="Live browser view"
                  className="absolute inset-0 h-full w-full border-0"
                  allow="fullscreen"
                />
                <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  Live
                </span>
              </>
            ) : (
              <div className="text-muted absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs">
                <Loader2 className="text-accent h-5 w-5 animate-spin" />
                Spinning up a browser…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details — goal, profile, result, errors. */}
      {open && (
        <div className="border-border space-y-3 border-t px-3.5 py-3 text-sm">
          {goal && (
            <Field label="Goal">
              <span className="text-foreground/90">{goal}</span>
            </Field>
          )}

          {usedProfile && (
            <Field label="Profile">
              <span className="text-muted">
                Reusing saved logged-in browser state
                {profileId ? ` (${profileId})` : " (default profile)"}
              </span>
            </Field>
          )}

          {isError && (
            <Field label="Error">
              <span className="text-red-500">
                {output.error ?? part.errorText ?? "The run did not complete."}
              </span>
            </Field>
          )}

          {isDone && (
            <Field label="Result">
              <ResultView result={output.result} />
            </Field>
          )}

          {isDone && output.videoUrl && (
            <a
              href={output.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <Video className="h-3.5 w-3.5" />
              Watch the recording
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({
  isRunning,
  isError,
}: {
  isRunning: boolean;
  isError: boolean;
}) {
  if (isRunning)
    return <Loader2 className="text-accent h-4 w-4 shrink-0 animate-spin" />;
  if (isError) return <CircleAlert className="h-4 w-4 shrink-0 text-red-500" />;
  return <CircleCheck className="text-accent h-4 w-4 shrink-0" />;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted text-[11px] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Pretty-print the agent result — objects as JSON, primitives as text. */
function ResultView({ result }: { result: unknown }) {
  if (result == null)
    return <span className="text-muted">No data returned</span>;

  if (typeof result === "string") {
    return <span className="whitespace-pre-wrap">{result}</span>;
  }

  return (
    <pre className="bg-surface-hover max-h-80 overflow-auto rounded-lg p-3 font-mono text-xs">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
