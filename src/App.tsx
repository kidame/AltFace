import { useState, useRef, useCallback, useEffect } from "react";

type Status = "idle" | "generating" | "done" | "error";

const QUICK_PROMPTS = [
  "Sensual portrait in silk lingerie, soft studio lighting, artistic boudoir",
  "Alluring pose on a luxury bed, dim warm lighting, elegant and seductive",
  "Steamy shower scene, water droplets on skin, dramatic lighting",
  "Provocative leather outfit, dark moody atmosphere, fashion editorial",
];

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function App() {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Timer for generation
  useEffect(() => {
    if (status === "generating") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const resized = await resizeImage(file);
    setFaceImage(resized);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function pollResult(requestId: string, index: number) {
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch("/api/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        });
        const data = await res.json();
        if (data.status === "completed" && data.image) {
          setResults((prev) => {
            const next = [...prev];
            next[index] = data.image;
            return next;
          });
          return;
        }
        if (data.status === "failed") throw new Error("Generation failed");
      } catch {
        // retry on network error
      }
    }
    throw new Error("Timeout");
  }

  async function handleGenerate() {
    if (!faceImage || !prompt.trim()) return;
    setStatus("generating");
    setError("");
    setResults([null, null, null, null]);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: faceImage, prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      const { requestIds } = (await res.json()) as { requestIds: string[] };

      const polls = requestIds.map((id, i) => pollResult(id, i));
      await Promise.allSettled(polls);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function downloadImage(url: string, index: number) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `altface-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback: open in new tab
      window.open(url, "_blank");
    }
  }

  const canGenerate =
    faceImage && prompt.trim() && status !== "generating";

  return (
    <div className="min-h-dvh bg-surface text-white">
      {/* Header */}
      <header className="pt-safe px-4 pt-6 pb-2 text-center">
        <h1 className="text-4xl font-black tracking-tight">
          Alt<span className="text-brand">Face</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ton visage. Tes fantasmes. Une autre dimension.
        </p>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-8">
        {/* Upload Zone */}
        <section className="mt-6">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative flex min-h-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
              dragOver
                ? "border-brand bg-brand/10"
                : faceImage
                  ? "border-surface-border bg-surface-light"
                  : "border-surface-border bg-surface-light hover:border-brand/50"
            }`}
          >
            {faceImage ? (
              <>
                <img
                  src={faceImage}
                  alt="Face preview"
                  className="h-full max-h-[300px] w-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                  <span className="text-sm font-medium">Changer la photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <svg
                  className="h-12 w-12 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                  />
                </svg>
                <p className="text-sm text-neutral-400">
                  Upload ta photo de visage
                </p>
                <p className="text-xs text-neutral-600">
                  Glisse ou clique ici
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </section>

        {/* Prompt */}
        <section className="mt-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the scene you want... be creative, no limits."
            rows={3}
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-light px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-brand"
          />

          {/* Quick prompts */}
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(qp)}
                className="rounded-full bg-surface-lighter px-3 py-1 text-xs text-neutral-400 transition-colors hover:bg-brand/20 hover:text-brand"
              >
                {qp.length > 35 ? qp.slice(0, 35) + "..." : qp}
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <section className="mt-5">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`w-full rounded-xl px-6 py-4 text-base font-bold transition-all ${
              canGenerate
                ? "animate-pulse-glow bg-brand text-white hover:bg-brand-dark active:scale-[0.98]"
                : "cursor-not-allowed bg-surface-lighter text-neutral-600"
            }`}
          >
            {status === "generating" ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generation en cours... {elapsed}s
              </span>
            ) : (
              "Generer dans une autre dimension"
            )}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results Grid */}
        {(status === "generating" || status === "done") && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-neutral-400">
              Resultats
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {results.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl bg-surface-light"
                >
                  {img ? (
                    <>
                      <img
                        src={img}
                        alt={`Result ${i + 1}`}
                        className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
                        onClick={() => setLightbox(img)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(img, i);
                        }}
                        className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-2 opacity-0 transition-opacity hover:bg-black/90 group-hover:opacity-100 [.group:hover_&]:opacity-100"
                        style={{ opacity: 1 }}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="animate-skeleton flex h-full w-full items-center justify-center bg-surface-lighter">
                      <svg
                        className="h-8 w-8 text-neutral-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={lightbox}
            alt="Fullscreen"
            className="max-h-[90dvh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-dark"
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(lightbox, 0);
            }}
          >
            Telecharger
          </button>
        </div>
      )}
    </div>
  );
}
