import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { parseCsv, stringifyCsv, ParsedCsv } from "./utils/csvParser";

interface ProcessedDataViewerProps {
  /** Presigned S3 URL for the processed CSV */
  downloadUrl: string;
  /** Original file name */
  fileName: string;
}

// ── Editable cell ───────────────────────────────────────────────────────────
function EditableCell({
  value,
  onChange,
  highlight,
}: {
  value: string;
  onChange: (v: string) => void;
  highlight?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (draft !== value) onChange(draft);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full px-2 py-1 text-sm bg-background border border-primary rounded
                   focus:outline-none focus:ring-2 focus:ring-primary/40
                   text-foreground font-mono"
      />
    );
  }

  // Highlight matching text
  const renderValue = () => {
    if (!value) return <span className="text-muted-foreground italic">empty</span>;
    if (!highlight) return value;

    const lower = value.toLowerCase();
    const hLower = highlight.toLowerCase();
    const idx = lower.indexOf(hLower);
    if (idx === -1) return value;

    return (
      <>
        {value.slice(0, idx)}
        <mark className="bg-yellow-200/80 text-foreground rounded-sm px-0.5">
          {value.slice(idx, idx + highlight.length)}
        </mark>
        {value.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="block w-full px-2 py-1 text-sm text-foreground cursor-text
                 rounded hover:bg-primary/5 transition-colors font-mono truncate"
    >
      {renderValue()}
    </span>
  );
}

// ── Column filter dropdown ──────────────────────────────────────────────────
function ColumnFilter({
  header,
  uniqueValues,
  selected,
  onChange,
}: {
  header: string;
  uniqueValues: string[];
  selected: string | null;
  onChange: (val: string | null) => void;
}) {
  return (
    <select
      value={selected ?? "__all__"}
      onChange={(e) => onChange(e.target.value === "__all__" ? null : e.target.value)}
      className="w-full mt-1 px-1.5 py-1 text-xs bg-card border border-primary/20 rounded
                 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40
                 truncate"
      title={`Filter by ${header}`}
    >
      <option value="__all__">All</option>
      {uniqueValues.map((v) => (
        <option key={v} value={v}>
          {v || "(empty)"}
        </option>
      ))}
    </select>
  );
}

// ── Helper: load CSV text into parsed state ─────────────────────────────────
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

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string | null>>({});
  const [editCount, setEditCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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
        // Most likely CORS — show the manual-load fallback
        if (!cancelled) {
          setFetchError("CORS");
        }
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

  // Unique values per column (for dropdowns) — only filterable columns
  const filterableColumns = useMemo(() => {
    if (!parsed) return [] as string[];
    return parsed.headers.filter((h) => {
      const uniq = new Set(parsed.rows.map((r) => r[h] ?? ""));
      return uniq.size <= 50 && uniq.size > 1;
    });
  }, [parsed]);

  const uniqueValuesMap = useMemo(() => {
    if (!parsed) return {} as Record<string, string[]>;
    const map: Record<string, string[]> = {};
    for (const h of filterableColumns) {
      const vals = [...new Set(parsed.rows.map((r) => r[h] ?? ""))].sort();
      map[h] = vals;
    }
    return map;
  }, [parsed, filterableColumns]);

  // Cell edit
  const handleCellChange = useCallback(
    (globalRowIdx: number, header: string, newValue: string) => {
      setParsed((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, rows: [...prev.rows] };
        updated.rows[globalRowIdx] = {
          ...updated.rows[globalRowIdx],
          [header]: newValue,
        };
        return updated;
      });
      setEditCount((c) => c + 1);
    },
    []
  );

  // Download edited version
  const handleDownloadEdited = useCallback(() => {
    if (!parsed) return;
    const csvString = stringifyCsv(parsed.headers, parsed.rows);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.csv$/i, "") + "-edited.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [parsed, fileName]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setColumnFilters({});
  }, []);

  const activeFilterCount =
    Object.values(columnFilters).filter((v) => v !== null).length +
    (searchQuery ? 1 : 0);

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
          To preview, search, filter, and edit your processed data, download the
          CSV using the button above, then load it here:
        </p>

        {/* Hidden file input */}
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
          {/* Upload icon */}
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

  // Build a map from filtered row → original index for editing
  const filteredWithIndex = (() => {
    const q = searchQuery.toLowerCase().trim();
    const result: { row: Record<string, string>; originalIdx: number }[] = [];

    parsed.rows.forEach((row, originalIdx) => {
      for (const [col, val] of Object.entries(columnFilters)) {
        if (val !== null && (row[col] ?? "") !== val) return;
      }
      if (q) {
        const match = parsed.headers.some((h) =>
          (row[h] ?? "").toLowerCase().includes(q)
        );
        if (!match) return;
      }
      result.push({ row, originalIdx });
    });

    return result;
  })();

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Processed Results
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {parsed.rows.length} total rows · Showing {filteredWithIndex.length}
              {editCount > 0 && (
                <span className="ml-2 text-primary font-medium">
                  ({editCount} edit{editCount > 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>

          {editCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadEdited}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary
                         text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Edited CSV
            </button>
          )}
        </div>

        {/* Search bar + filter toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all columns…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-primary/20
                         bg-[var(--input-background)] text-foreground
                         placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                         transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((f) => !f)}
            className={[
              "shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
              showFilters
                ? "border-primary bg-primary/10 text-primary"
                : "border-primary/20 text-muted-foreground hover:text-foreground hover:border-primary/40",
            ].join(" ")}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="shrink-0 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Column filter dropdowns */}
        {showFilters && filterableColumns.length > 0 && (
          <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            {filterableColumns.map((h) => (
              <div key={h} className="min-w-[140px] max-w-[200px]">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {h}
                </label>
                <ColumnFilter
                  header={h}
                  uniqueValues={uniqueValuesMap[h] ?? []}
                  selected={columnFilters[h] ?? null}
                  onChange={(val) =>
                    setColumnFilters((prev) => ({ ...prev, [h]: val }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info tip */}
      <div className="mb-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Tip:</span> Click any
          cell to edit it in-place. Use the search bar and column filters to find
          specific entries. Edits are reflected in the "Download Edited CSV"
          export.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-primary/10">
        {filteredWithIndex.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No rows match your current search or filters.
            </p>
          </div>
        ) : (
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
              {filteredWithIndex.map(({ row, originalIdx }, displayIdx) => (
                <tr
                  key={originalIdx}
                  className={displayIdx % 2 === 0 ? "bg-card/30" : "bg-card/60"}
                >
                  <td className="px-3 py-1 text-xs text-muted-foreground text-center tabular-nums">
                    {originalIdx + 1}
                  </td>
                  {parsed.headers.map((h) => (
                    <td key={h} className="px-1 py-0.5">
                      <EditableCell
                        value={row[h] ?? ""}
                        onChange={(v) => handleCellChange(originalIdx, h, v)}
                        highlight={searchQuery}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredWithIndex.length} of {parsed.rows.length} rows
        </span>
        {editCount > 0 && (
          <span className="text-primary font-medium">
            {editCount} cell{editCount > 1 ? "s" : ""} edited — download to save
          </span>
        )}
      </div>
    </section>
  );
}