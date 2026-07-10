"use client";

import { startTransition, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type DashboardActionsProps = {
  defaultSnapshotDate: string;
  hasSnapshots: boolean;
  summaryText: string;
};

export function DashboardActions({
  defaultSnapshotDate,
  hasSnapshots,
  summaryText,
}: DashboardActionsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(defaultSnapshotDate);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function refreshPage() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadMessage(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadMessage("Pick a CSV file before uploading.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("snapshotDate", snapshotDate);

      const response = await fetch("/api/campaign/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setUploadMessage(payload.message ?? "Snapshot uploaded.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await refreshPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setUploadMessage(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleLoadSamples() {
    setHelperMessage(null);
    setIsLoadingSamples(true);

    try {
      const response = await fetch("/api/campaign/load-sample", {
        method: "POST",
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load sample data.");
      }

      setHelperMessage(payload.message ?? "Sample data loaded.");
      await refreshPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load sample data.";
      setHelperMessage(message);
    } finally {
      setIsLoadingSamples(false);
    }
  }

  async function handleReset() {
    setHelperMessage(null);
    setIsResetting(true);

    try {
      const response = await fetch("/api/campaign/reset", {
        method: "POST",
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not reset snapshots.");
      }

      setHelperMessage(payload.message ?? "Snapshots cleared.");
      await refreshPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reset snapshots.";
      setHelperMessage(message);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setHelperMessage("Summary copied to your clipboard.");
    } catch {
      setHelperMessage("Clipboard copy was blocked. You can still copy the text manually below.");
    }
  }

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={handleUpload}>
        <div className="grid gap-4 md:grid-cols-[1fr_13rem]">
          <label className="space-y-2">
            <span className="text-sm font-medium">CSV file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-inverse"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Snapshot week</span>
            <input
              type="date"
              value={snapshotDate}
              onChange={(event) => setSnapshotDate(event.target.value)}
              className="block w-full rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isUploading}
            className="rounded-[18px] bg-accent px-4 py-3 text-sm font-medium text-ink-inverse transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading ? "Uploading..." : "Upload weekly snapshot"}
          </button>
          <button
            type="button"
            onClick={handleLoadSamples}
            disabled={isLoadingSamples}
            className="rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm font-medium transition hover:border-accent/45 hover:text-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoadingSamples ? "Loading samples..." : "Load sample data"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting || !hasSnapshots}
            className="rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm font-medium transition hover:border-accent/45 hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isResetting ? "Clearing..." : "Reset stored snapshots"}
          </button>
        </div>

        {uploadMessage ? <p className="text-sm text-ink-soft">{uploadMessage}</p> : null}
        {helperMessage ? <p className="text-sm text-ink-soft">{helperMessage}</p> : null}
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Copyable weekly summary</p>
            <p className="mt-1 text-sm text-ink-soft">
              Use this for field notes, email recaps, or campaign planning docs.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySummary}
            className="rounded-[18px] border border-line bg-bg/70 px-4 py-3 text-sm font-medium transition hover:border-accent/45 hover:text-accent"
          >
            Copy text
          </button>
        </div>

        <textarea
          readOnly
          value={summaryText}
          className="min-h-44 w-full rounded-[22px] border border-line bg-bg/70 px-4 py-4 text-sm leading-6 text-ink-soft"
        />
      </div>
    </div>
  );
}
