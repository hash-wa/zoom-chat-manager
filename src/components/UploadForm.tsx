"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChosen(file: File | null) {
    setFileName(file ? file.name : null);
    if (fileInputRef.current && file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
    }
  }

  function buildForm(force: boolean): FormData | null {
    const form = new FormData();
    if (title.trim()) form.set("title", title.trim());
    if (force) form.set("force", "true");

    if (mode === "file") {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError("Choose a .txt file to upload");
        return null;
      }
      form.set("file", file);
    } else {
      if (!pastedText.trim()) {
        setError("Paste some chat text first");
        return null;
      }
      form.set("text", pastedText);
    }
    return form;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const form = buildForm(false);
    if (!form) return;

    setLoading(true);
    try {
      let res = await fetch("/api/chats", { method: "POST", body: form });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const proceed = confirm(`${data.error ?? "This looks like a duplicate."} Upload anyway?`);
        if (!proceed) return;
        const forcedForm = buildForm(true);
        if (!forcedForm) return;
        res = await fetch("/api/chats", { method: "POST", body: forcedForm });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed");
        return;
      }
      const { id } = await res.json();
      router.push(`/chats/${id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1.5 rounded-lg border ${
            mode === "file"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
          }`}
        >
          Upload .txt file
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`px-3 py-1.5 rounded-lg border ${
            mode === "paste"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
          }`}
        >
          Paste text
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q3 planning meeting"
          className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileChosen(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-300 dark:border-slate-600"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {fileName ? (
              <span className="font-medium text-slate-900 dark:text-slate-100">{fileName}</span>
            ) : (
              <>Drag & drop a Zoom chat .txt file here, or click to browse</>
            )}
          </p>
        </div>
      ) : (
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={10}
          placeholder="Paste the contents of a Zoom saved chat .txt file here..."
          className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Save chat"}
      </button>
    </form>
  );
}
