"use client";

import { useEffect, useRef, useState } from "react";
import { matchOcrTextToPlayers, type OcrMatch, type OcrTextBlock } from "@/lib/importSquad";
import type { Player } from "@/lib/types";
import { GLASS_CARD } from "@/lib/ui";

type Status = "idle" | "scanning" | "done" | "error";

function extractWords(page: {
  blocks: { paragraphs: { lines: { words: { text: string; confidence: number }[] }[] }[] }[] | null;
  text: string;
  confidence: number;
}): OcrTextBlock[] {
  if (page.blocks && page.blocks.length > 0) {
    const words: OcrTextBlock[] = [];
    for (const block of page.blocks) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const word of line.words) {
            words.push({ text: word.text, confidence: word.confidence });
          }
        }
      }
    }
    if (words.length > 0) return words;
  }
  return page.text
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, confidence: page.confidence }));
}

export function SquadImport({
  players,
  onImport,
}: {
  players: Player[];
  onImport: (matches: OcrMatch[]) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [matches, setMatches] = useState<OcrMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processImage(source: File | Blob) {
    setStatus("scanning");
    setError(null);
    setProgress(0);
    setProgressLabel("Warming up…");
    setPreview(URL.createObjectURL(source));

    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(source, "eng", {
        logger: (m) => {
          setProgressLabel(m.status);
          setProgress(m.progress);
        },
      });
      const words = extractWords(data);
      const found = matchOcrTextToPlayers(words, players);
      setMatches(found);
      setStatus("done");
      onImport(found);
    } catch {
      setStatus("error");
      setError("Couldn't read that image. Try a clearer screenshot, or build your squad manually below.");
    }
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        processImage(file);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processImage(file);
  }

  function reset() {
    setStatus("idle");
    setPreview(null);
    setMatches([]);
    setError(null);
  }

  return (
    <div
      className={`rounded-2xl p-5 ${GLASS_CARD}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-[#251f38]">Import from a screenshot</h2>
          <p className="text-sm text-[#6c6482] mt-0.5">
            Upload a screenshot of your FPL squad, or paste one from your clipboard
            (Ctrl+V / Cmd+V) — we&apos;ll read the player names and pre-fill your picks below.
          </p>
        </div>
        {status !== "idle" && (
          <button
            onClick={reset}
            className="text-sm font-medium text-[#6c6482] hover:text-[#251f38] shrink-0"
          >
            Start over
          </button>
        )}
      </div>

      {status === "idle" && (
        <div
          className={`mt-4 rounded-xl border-2 border-dashed ${
            dragOver ? "border-[var(--accent-to)] bg-white/50" : "border-white/70"
          } px-4 py-8 text-center transition-colors`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] text-white font-medium px-5 py-2.5 rounded-full shadow-[0_12px_24px_-8px_rgba(var(--accent-rgb),0.6)] active:scale-[0.98] transition-all"
          >
            Choose a screenshot
          </button>
          <p className="text-xs text-[#6c6482] mt-3">
            or paste an image anywhere on this page, or drag one here
          </p>
        </div>
      )}

      {status === "scanning" && (
        <div className="mt-4 flex items-center gap-4">
          {preview && (
            <img
              src={preview}
              alt="Uploaded squad screenshot"
              className="w-24 h-16 object-cover rounded-lg border border-white/70 shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="text-sm text-[#251f38] font-medium capitalize">
              {progressLabel || "Reading your screenshot…"}
            </div>
            <div className="h-1.5 rounded-full bg-white/70 overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {status === "done" && (
        <div className="mt-4 flex items-start gap-4">
          {preview && (
            <img
              src={preview}
              alt="Uploaded squad screenshot"
              className="w-24 h-16 object-cover rounded-lg border border-white/70 shrink-0"
            />
          )}
          <div className="flex-1">
            {matches.length > 0 ? (
              <>
                <p className="text-sm text-[#251f38] font-medium">
                  Found {matches.length} player{matches.length === 1 ? "" : "s"} — added below.
                  Double-check the list and adjust anything that&apos;s off.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {matches.map((m) => (
                    <span
                      key={m.player.id}
                      className="text-[11px] font-medium bg-white/70 border border-white/70 text-[#6c6482] rounded-full px-2 py-0.5"
                    >
                      {m.player.web_name}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#6c6482]">
                Couldn&apos;t confidently match any players in that image. Try a clearer
                screenshot, or build your squad manually below.
              </p>
            )}
          </div>
        </div>
      )}

      {status === "error" && error && (
        <p className="mt-4 text-sm text-[#c94f3f]">{error}</p>
      )}
    </div>
  );
}
