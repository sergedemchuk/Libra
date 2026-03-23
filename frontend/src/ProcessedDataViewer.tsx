import { useState, useEffect, useCallback, useRef } from "react";
import { parseCsv, ParsedCsv } from "./utils/csvParser";

interface ProcessedDataViewerProps {
  /** Presigned S3 URL for the processed CSV */
  downloadUrl: string;
  /** Original file name */
  fileName: string;
}

// ── Helper: parse CSV text ──────────────────────────────────────────────────
function tryParseCsvText(text: string): ParsedCsv | string {
  const result = parseCsv(text);
  if (result.headers.length === 0) return "Processed file appears empty.";
  return result;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProcessedDataViewer({
  downloadUrl,
  fileName,
}: ProcessedDataViewerProps) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Attempt to auto-fetch the presigned URL ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const result = tryParseCsvText(text);
        if (typeof result === "string") {
          setFetchError(result);
        } else {
          setParsed(result);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError("CORS");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  // ── Handle manual file load (CORS fallback) ──────────────────────────────
  const handleManualFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      file
        .text()
        .then((text) => {
          const result = tryParseCsvText(text);
          if (typeof result === "string") {
            setFetchError(result);
          } else {
            setParsed(result);
            setFetchError(null);
          }
        })
        .catch(() => {
          setFetchError("Could not read the file. Please make sure it's a valid CSV.");
        });
    },
    []
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading processed data…</span>
        </div>
      </section>
    );
  }

  // ── CORS / fetch-error fallback ───────────────────────────────────────────
  if (fetchError && !parsed) {
    return (
      <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          View Processed Results
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          To view your processed data, download the CSV using the button above,
          then load it here:
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleManualFileLoad}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                     border-2 border-dashed border-primary/30 text-sm font-medium
                     text-primary hover:bg-primary/5 hover:border-primary/50
                     focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Load Downloaded CSV to Preview
        </button>

        {fetchError !== "CORS" && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
        )}
      </section>
    );
  }

  if (!parsed) return null;

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Processed Results
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {parsed.rows.length} rows · {parsed.headers.length} columns
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-primary/10">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary/10">
              <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-12 text-center">
                #
              </th>
              {parsed.headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-xs font-semibold text-foreground uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((row, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? "bg-card/30" : "bg-card/60"}
              >
                <td className="px-3 py-1.5 text-xs text-muted-foreground text-center tabular-nums">
                  {idx + 1}
                </td>
                {parsed.headers.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-1.5 text-sm text-foreground font-mono truncate max-w-[200px]"
                  >
                    {row[h] || (
                      <span className="text-muted-foreground italic">empty</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 text-xs text-muted-foreground">
        {parsed.rows.length} rows
      </div>
    </section>
  );
}