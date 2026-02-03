// components/form/IndMultiFileUpload.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ExistingFileItem = {
  id: number | string;
  name: string;
  url: string;
  mimetype?: string;
  groupId?: number | string;
  meta?: Record<string, unknown>;
};

export type UploadedFileItem = {
  id: number | string;
  name: string;
  url: string;
  mimetype?: string;
  size?: number;
  groupId?: number | string;
  meta?: Record<string, unknown>;
};

type StateSetter<T> = (next: T) => void;
type SetStateLike<T> = StateSetter<T> | React.Dispatch<React.SetStateAction<T>>;

export type IndMultiFileUploadProps = {
  /** UI */
  label: string;
  hint?: string;
  otherTerms?: string;
  accept?: string;
  className?: string;

  maxFiles?: number;
  maxFileSizeMB?: number;
  allowDuplicates?: boolean;
  disabled?: boolean;
  droppable?: boolean;
  emptyPlaceholder?: React.ReactNode;
  showImagePreview?: boolean;

  /** Queue (local files) - optional controlled */
  value?: File[];
  defaultValue?: File[];
  onChange?: SetStateLike<File[]>;

  /** Existing server items (optional) */
  existingItems?: ExistingFileItem[];
  existingHeader?: string;
  onRemoveExisting?: (item: ExistingFileItem) => void | Promise<void>;

  /** Uploaded results list - optional controlled */
  uploadedItems?: UploadedFileItem[];
  defaultUploadedItems?: UploadedFileItem[];
  onUploadedItemsChange?: SetStateLike<UploadedFileItem[]>;
  uploadedHeader?: string;

  /** Upload behavior (independent) */
  uploadFiles?: (files: File[]) => Promise<UploadedFileItem[]>;
  onRemoveUploaded?: (item: UploadedFileItem) => void | Promise<void>;
  uploadButtonText?: string;
  autoUpload?: boolean;
  clearQueueAfterUpload?: boolean;

  /** Events */
  onReject?: (messages: string[]) => void;
  onUploadSuccess?: (newItems: UploadedFileItem[], uploadedFiles: File[]) => void;
  onUploadError?: (error: unknown) => void;
};

function humanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const u = ["B", "KB", "MB", "GB"] as const;
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i += 1;
  }
  const v = i === 0 ? String(Math.round(n)) : n.toFixed(1);
  return `${v} ${u[i]}`;
}

function fileKey(f: File) {
  return `${f.name}__${f.size}__${f.lastModified}`;
}

function isImageFile(f: File) {
  return f.type.startsWith("image/");
}

function isImageUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.includes("mimetype=image")
  );
}

function uniqUploadedById(items: UploadedFileItem[]) {
  const map = new Map<string, UploadedFileItem>();
  for (const it of items) map.set(String(it.id), it);
  return Array.from(map.values());
}

function callSetStateLike<T>(setter: SetStateLike<T> | undefined, next: T) {
  if (!setter) return;
  // both setter types accept "next" directly
  (setter as StateSetter<T>)(next);
}

export default function IndMultiFileUpload(props: IndMultiFileUploadProps) {
  const {
    label,
    hint = "Maks. 10 MB per file.",
    otherTerms = "",
    accept = "",
    className,

    maxFiles,
    maxFileSizeMB = 10,
    allowDuplicates = false,
    disabled = false,
    droppable = true,
    emptyPlaceholder,
    showImagePreview = true,

    value,
    defaultValue = [],
    onChange,

    existingItems,
    existingHeader = "Existing",
    onRemoveExisting,

    uploadedItems,
    defaultUploadedItems = [],
    onUploadedItemsChange,
    uploadedHeader = "Uploaded",

    uploadFiles,
    onRemoveUploaded,
    uploadButtonText = "Upload",
    autoUpload = true,
    clearQueueAfterUpload = true,

    onReject,
    onUploadSuccess,
    onUploadError,
  } = props;

  const queueControlled = Array.isArray(value);
  const [queueInternal, setQueueInternal] = useState<File[]>(defaultValue);
  const queue = queueControlled ? (value as File[]) : queueInternal;

  const setQueue = useCallback(
    (next: File[]) => {
      if (!queueControlled) setQueueInternal(next);
      callSetStateLike(onChange, next);
    },
    [onChange, queueControlled]
  );

  const uploadedControlled = Array.isArray(uploadedItems);
  const [uploadedInternal, setUploadedInternal] =
    useState<UploadedFileItem[]>(defaultUploadedItems);
  const uploaded = uploadedControlled
    ? (uploadedItems as UploadedFileItem[])
    : uploadedInternal;

  const setUploaded = useCallback(
    (next: UploadedFileItem[]) => {
      if (!uploadedControlled) setUploadedInternal(next);
      callSetStateLike(onUploadedItemsChange, next);
    },
    [onUploadedItemsChange, uploadedControlled]
  );

  // sync defaults for uncontrolled (edit prefill)
  useEffect(() => {
    if (!queueControlled) setQueueInternal(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  useEffect(() => {
    if (!uploadedControlled) setUploadedInternal(defaultUploadedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultUploadedItems]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const maxBytes = useMemo(
    () => Math.max(0, maxFileSizeMB) * 1024 * 1024,
    [maxFileSizeMB]
  );

  const validate = useCallback(
    (files: File[]) => {
      const messages: string[] = [];
      const valid: File[] = [];

      // count limit (queue + existing uploaded)
      const baseCount = (uploaded?.length ?? 0) + (queue?.length ?? 0);
      const room =
        typeof maxFiles === "number" && maxFiles > 0
          ? Math.max(0, maxFiles - baseCount)
          : Infinity;

      for (const f of files) {
        if (maxBytes && f.size > maxBytes) {
          messages.push(
            `${f.name} (${humanSize(f.size)}) melebihi ${maxFileSizeMB} MB`
          );
          continue;
        }
        valid.push(f);
      }

      let trimmed = valid;
      if (valid.length > room) {
        trimmed = valid.slice(0, room);
        for (const f of valid.slice(room)) {
          messages.push(`${f.name} melebihi batas max files (${maxFiles})`);
        }
      }

      if (!allowDuplicates) {
        const existingKeys = new Set(queue.map(fileKey));
        const out: File[] = [];
        for (const f of trimmed) {
          const k = fileKey(f);
          if (existingKeys.has(k)) continue;
          existingKeys.add(k);
          out.push(f);
        }
        trimmed = out;
      }

      return { valid: trimmed, messages };
    },
    [allowDuplicates, maxBytes, maxFileSizeMB, maxFiles, queue, uploaded]
  );

  const addFilesToQueue = useCallback(
    (files: File[]) => {
      const { valid, messages } = validate(files);
      if (messages.length) {
        setErr(messages.join("\n"));
        onReject?.(messages);
      } else {
        setErr(null);
      }
      if (!valid.length) return;
      setQueue([...queue, ...valid]);
    },
    [onReject, queue, setQueue, validate]
  );

  const pickFiles = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length) addFilesToQueue(files);
      e.target.value = "";
    },
    [addFilesToQueue]
  );

  const removeQueued = useCallback(
    (idx: number) => {
      const next = queue.filter((_, i) => i !== idx);
      setQueue(next);
    },
    [queue, setQueue]
  );

  const doUpload = useCallback(async () => {
    if (!uploadFiles) return;
    if (!queue.length || busy || disabled) return;

    setBusy(true);
    setErr(null);

    try {
      const newItems = await uploadFiles(queue);
      const merged = uniqUploadedById([...(uploaded ?? []), ...(newItems ?? [])]);
      setUploaded(merged);
      onUploadSuccess?.(newItems ?? [], queue);

      if (clearQueueAfterUpload) setQueue([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal upload file.");
      onUploadError?.(e);
    } finally {
      setBusy(false);
    }
  }, [
    uploadFiles,
    queue,
    busy,
    disabled,
    uploaded,
    setUploaded,
    onUploadSuccess,
    clearQueueAfterUpload,
    setQueue,
    onUploadError,
  ]);

  useEffect(() => {
    if (!uploadFiles) return;
    if (!autoUpload) return;
    if (!queue.length) return;
    void doUpload();
  }, [autoUpload, doUpload, queue.length, uploadFiles]);

  const removeUploaded = useCallback(
    async (item: UploadedFileItem) => {
      if (busy || disabled) return;

      setErr(null);
      try {
        if (onRemoveUploaded) await onRemoveUploaded(item);
        const next = (uploaded ?? []).filter((x) => String(x.id) !== String(item.id));
        setUploaded(next);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menghapus file.");
      }
    },
    [busy, disabled, onRemoveUploaded, setUploaded, uploaded]
  );

  // preview for local image files
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!showImagePreview) return;

    const next: Record<string, string> = {};
    for (const f of queue) {
      if (!isImageFile(f)) continue;
      const k = fileKey(f);
      next[k] = previews[k] ?? URL.createObjectURL(f);
    }

    // revoke removed
    for (const k of Object.keys(previews)) {
      if (!next[k]) URL.revokeObjectURL(previews[k]);
    }

    setPreviews(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, showImagePreview]);

  useEffect(() => {
    return () => {
      for (const k of Object.keys(previews)) URL.revokeObjectURL(previews[k]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag & Drop
  const [dragOver, setDragOver] = useState(false);
  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!droppable || disabled) return;
      e.preventDefault();
      setDragOver(true);
    },
    [droppable, disabled]
  );
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!droppable || disabled) return;
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (files.length) addFilesToQueue(files);
    },
    [droppable, disabled, addFilesToQueue]
  );

  const canUpload = !!uploadFiles && !autoUpload && queue.length > 0;

  return (
    <div
      className={[
        "w-full rounded-xl border bg-white/70 p-3",
        droppable
          ? dragOver
            ? "border-primary-400 ring-2 ring-primary-200"
            : "border-slate-200"
          : "border-slate-200",
        className ?? "",
      ].join(" ")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {label}
          </div>
          <div className="text-xs text-slate-500">
            {hint} {otherTerms ? <span className="ml-1">{otherTerms}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={onInputChange}
            className="hidden"
            disabled={disabled}
          />

          <button
            type="button"
            onClick={pickFiles}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={disabled || busy}
          >
            + Pilih File
          </button>

          {canUpload ? (
            <button
              type="button"
              onClick={() => void doUpload()}
              className="inline-flex items-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm hover:bg-primary-100 disabled:opacity-50"
              disabled={disabled || busy}
            >
              {busy ? "Uploading..." : uploadButtonText}
            </button>
          ) : null}
        </div>
      </div>

      {droppable ? (
        <div className="mb-2 text-xs text-slate-500">
          Drag &amp; drop file ke area ini (opsional)
        </div>
      ) : null}

      {err ? (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          {err}
        </pre>
      ) : null}

      {/* Queue */}
      {queue.length ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2">
          <div className="mb-2 text-xs font-semibold text-slate-700">Queue</div>
          <ul className="space-y-2">
            {queue.map((f, idx) => {
              const k = fileKey(f);
              const pv = previews[k];
              const showPv = showImagePreview && !!pv;

              return (
                <li
                  key={k}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2"
                >
                  {showPv ? (
                    <img
                      src={pv}
                      alt={f.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      {f.name.split(".").pop()?.slice(0, 4)?.toUpperCase() ?? "FILE"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {humanSize(f.size)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeQueued(idx)}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={disabled || busy}
                  >
                    Hapus
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Existing (server) */}
      {existingItems?.length ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2">
          <div className="mb-2 text-xs font-semibold text-slate-700">
            {existingHeader}
          </div>
          <ul className="space-y-2">
            {existingItems.map((it) => (
              <li
                key={String(it.id)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-semibold text-primary-700 hover:underline"
                  >
                    {it.name}
                  </a>
                </div>

                {onRemoveExisting ? (
                  <button
                    type="button"
                    onClick={() => void onRemoveExisting(it)}
                    className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={disabled || busy}
                  >
                    Hapus
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Uploaded results */}
      <div className="mt-3">
        {uploaded?.length ? (
          <div className="rounded-lg border border-slate-200 bg-white/60 p-2">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              {uploadedHeader}
            </div>
            <ul className="space-y-2">
              {uploaded.map((it) => (
                <li
                  key={String(it.id)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-semibold text-primary-700 hover:underline"
                    >
                      {it.name}
                    </a>
                    {showImagePreview && isImageUrl(it.url) ? (
                      <img
                        src={it.url}
                        alt={it.name}
                        className="mt-2 max-h-44 w-full rounded-lg object-contain"
                      />
                    ) : null}
                  </div>

                  {onRemoveUploaded ? (
                    <button
                      type="button"
                      onClick={() => void removeUploaded(it)}
                      className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      disabled={disabled || busy}
                    >
                      Hapus
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/40 p-3 text-sm text-slate-500">
            {emptyPlaceholder ?? "Belum ada file."}
          </div>
        )}
      </div>
    </div>
  );
}


// // components/form/IndMultiFileUpload.tsx
// "use client";

// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// export type UploadedFileItem = {
//   id: number | string;
//   name: string;
//   url?: string;
//   mimetype?: string;
//   groupId?: number;
//   meta?: Record<string, unknown>;
// };

// export type IndMultiFileUploadProps = {
//   label?: string;
//   accept?: string;
//   maxFileSizeMB?: number;
//   maxFiles?: number;
//   hint?: string;
//   emptyPlaceholder?: React.ReactNode;
//   uploadButtonText?: string;

//   /** Controlled list (source of truth di parent). */
//   uploadedItems?: UploadedFileItem[];
//   /** Uncontrolled initial list (kalau tidak pakai uploadedItems). */
//   defaultUploadedItems?: UploadedFileItem[];
//   /** Dipanggil ketika list berubah (delete / merge hasil upload). */
//   onUploadedItemsChange?: (next: UploadedFileItem[]) => void;

//   /** Wajib: logic upload ke backend. */
//   uploadFiles: (files: File[]) => Promise<UploadedFileItem[]>;
//   /** Opsional: hapus file yang sudah ter-upload (remote). */
//   onRemoveUploaded?: (item: UploadedFileItem) => Promise<void>;

//   /** UX */
//   autoUpload?: boolean;
//   clearQueueAfterUpload?: boolean;
//   droppable?: boolean;
// };

// function sameUploaded(a: UploadedFileItem, b: UploadedFileItem) {
//   return String(a.id) === String(b.id);
// }

// function uniqById(items: UploadedFileItem[]): UploadedFileItem[] {
//   const map = new Map<string, UploadedFileItem>();
//   for (const it of items) map.set(String(it.id), it);
//   return Array.from(map.values());
// }

// function humanSize(bytes: number) {
//   if (!Number.isFinite(bytes)) return "";
//   const u = ["B", "KB", "MB", "GB"] as const;
//   let n = bytes;
//   let i = 0;
//   while (n >= 1024 && i < u.length - 1) {
//     n /= 1024;
//     i += 1;
//   }
//   const v = i === 0 ? String(Math.round(n)) : n.toFixed(1);
//   return `${v} ${u[i]}`;
// }

// export default function IndMultiFileUpload(props: IndMultiFileUploadProps) {
//   const {
//     label,
//     accept,
//     maxFileSizeMB = 10,
//     maxFiles,
//     hint,
//     emptyPlaceholder,
//     uploadButtonText = "Upload",
//     uploadedItems,
//     defaultUploadedItems,
//     onUploadedItemsChange,
//     uploadFiles,
//     onRemoveUploaded,
//     autoUpload = true,
//     clearQueueAfterUpload = true,
//     droppable = false,
//   } = props;

//   const isControlled = Array.isArray(uploadedItems);
//   const [internalUploaded, setInternalUploaded] = useState<UploadedFileItem[]>(
//     () => defaultUploadedItems ?? []
//   );
//   const list = isControlled
//     ? (uploadedItems as UploadedFileItem[])
//     : internalUploaded;

//   const commitList = useCallback(
//     (next: UploadedFileItem[]) => {
//       if (isControlled) {
//         onUploadedItemsChange?.(next);
//       } else {
//         setInternalUploaded(next);
//         onUploadedItemsChange?.(next);
//       }
//     },
//     [isControlled, onUploadedItemsChange]
//   );

//   // keep uncontrolled list in sync when defaultUploadedItems berubah (prefill edit)
//   useEffect(() => {
//     if (isControlled) return;
//     if (defaultUploadedItems) setInternalUploaded(defaultUploadedItems);
//   }, [defaultUploadedItems, isControlled]);

//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const [queue, setQueue] = useState<File[]>([]);
//   const [busy, setBusy] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const maxBytes = useMemo(() => maxFileSizeMB * 1024 * 1024, [maxFileSizeMB]);

//   const validateFiles = useCallback(
//     (files: File[]) => {
//       const picked = [...files];
//       const valid: File[] = [];
//       const bad: string[] = [];

//       for (const f of picked) {
//         if (maxBytes && f.size > maxBytes) {
//           bad.push(
//             `${f.name} (${humanSize(f.size)}) melebihi ${maxFileSizeMB} MB`
//           );
//           continue;
//         }
//         valid.push(f);
//       }

//       // enforce max files (existing + queue + valid)
//       if (typeof maxFiles === "number" && maxFiles > 0) {
//         const allowed = Math.max(0, maxFiles - list.length - queue.length);
//         if (valid.length > allowed) {
//           const trimmed = valid.slice(0, allowed);
//           const dropped = valid.slice(allowed);
//           for (const f of dropped)
//             bad.push(`${f.name} melebihi batas max files (${maxFiles})`);
//           return { valid: trimmed, bad };
//         }
//       }

//       return { valid, bad };
//     },
//     [list.length, maxBytes, maxFileSizeMB, maxFiles, queue.length]
//   );

//   const pushQueue = useCallback(
//     (files: File[]) => {
//       const { valid, bad } = validateFiles(files);
//       setErr(bad.length ? bad.join("\n") : null);
//       if (!valid.length) return;
//       setQueue((prev) => [...prev, ...valid]);
//     },
//     [validateFiles]
//   );

//   const pickFiles = useCallback(() => {
//     inputRef.current?.click();
//   }, []);

//   const onInputChange = useCallback(
//     (e: React.ChangeEvent<HTMLInputElement>) => {
//       const files = e.target.files ? Array.from(e.target.files) : [];
//       if (files.length) pushQueue(files);
//       e.target.value = "";
//     },
//     [pushQueue]
//   );

//   const doUpload = useCallback(async () => {
//     if (!queue.length || busy) return;
//     setBusy(true);
//     setErr(null);
//     try {
//       const newItems = await uploadFiles(queue);
//       const merged = uniqById([...list, ...newItems]);
//       commitList(merged);
//       if (clearQueueAfterUpload) setQueue([]);
//     } catch (e) {
//       const msg = e instanceof Error ? e.message : "Gagal upload file.";
//       setErr(msg);
//     } finally {
//       setBusy(false);
//     }
//   }, [busy, clearQueueAfterUpload, commitList, list, queue, uploadFiles]);

//   useEffect(() => {
//     if (!autoUpload) return;
//     if (!queue.length) return;
//     void doUpload();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [queue.length, autoUpload]);

//   const removeUploaded = useCallback(
//     async (item: UploadedFileItem) => {
//       setErr(null);
//       try {
//         if (onRemoveUploaded) await onRemoveUploaded(item);
//         const next = list.filter((x) => !sameUploaded(x, item));
//         commitList(next);
//       } catch (e) {
//         const msg = e instanceof Error ? e.message : "Gagal menghapus file.";
//         setErr(msg);
//       }
//     },
//     [commitList, list, onRemoveUploaded]
//   );

//   // Drag & Drop (optional)
//   const [dragOver, setDragOver] = useState(false);
//   const onDragOver = useCallback(
//     (e: React.DragEvent) => {
//       if (!droppable) return;
//       e.preventDefault();
//       setDragOver(true);
//     },
//     [droppable]
//   );
//   const onDragLeave = useCallback(() => setDragOver(false), []);
//   const onDrop = useCallback(
//     (e: React.DragEvent) => {
//       if (!droppable) return;
//       e.preventDefault();
//       setDragOver(false);
//       const files = e.dataTransfer?.files
//         ? Array.from(e.dataTransfer.files)
//         : [];
//       if (files.length) pushQueue(files);
//     },
//     [droppable, pushQueue]
//   );

//   return (
//     <div
//       className={
//         "w-full rounded-xl border bg-white/70 p-3 " +
//         (droppable
//           ? dragOver
//             ? "border-primary-400 ring-2 ring-primary-200"
//             : "border-slate-200"
//           : "border-slate-200")
//       }
//       onDragOver={onDragOver}
//       onDragLeave={onDragLeave}
//       onDrop={onDrop}
//     >
//       {label ? (
//         <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
//           {label}
//         </div>
//       ) : null}

//       <div className="flex flex-wrap items-center gap-2">
//         <input
//           ref={inputRef}
//           type="file"
//           multiple
//           accept={accept}
//           onChange={onInputChange}
//           className="hidden"
//         />

//         <button
//           type="button"
//           onClick={pickFiles}
//           className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
//           disabled={busy}
//         >
//           + Pilih File
//         </button>

//         {!autoUpload ? (
//           <button
//             type="button"
//             onClick={doUpload}
//             className="inline-flex items-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm hover:bg-primary-100 disabled:opacity-50"
//             disabled={busy || queue.length === 0}
//           >
//             {busy ? "Uploading..." : uploadButtonText}
//           </button>
//         ) : null}

//         <div className="min-w-0 flex-1">
//           {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
//           {droppable ? (
//             <div className="text-xs text-slate-500">
//               atau drag &amp; drop file ke area ini
//             </div>
//           ) : null}
//         </div>
//       </div>

//       {err ? (
//         <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
//           {err}
//         </pre>
//       ) : null}

//       {queue.length ? (
//         <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2">
//           <div className="mb-1 text-xs font-semibold text-slate-700">Queue</div>
//           <ul className="space-y-1">
//             {queue.map((f, idx) => (
//               <li
//                 key={`${f.name}-${f.size}-${idx}`}
//                 className="flex items-center gap-2"
//               >
//                 <div className="min-w-0 flex-1 truncate text-xs text-slate-700">
//                   {f.name}
//                 </div>
//                 <div className="shrink-0 text-[11px] text-slate-500">
//                   {humanSize(f.size)}
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ) : null}

//       <div className="mt-3">
//         {list.length ? (
//           <ul className="space-y-2">
//             {list.map((it) => (
//               <li
//                 key={String(it.id)}
//                 className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 p-2"
//               >
//                 <div className="min-w-0 flex-1">
//                   {it.url ? (
//                     <a
//                       href={it.url}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="block truncate text-sm font-semibold text-primary-700 hover:underline"
//                     >
//                       {it.name}
//                     </a>
//                   ) : (
//                     <div className="truncate text-sm font-semibold text-slate-800">
//                       {it.name}
//                     </div>
//                   )}
//                 </div>

//                 {onRemoveUploaded ? (
//                   <button
//                     type="button"
//                     onClick={() => void removeUploaded(it)}
//                     className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
//                     disabled={busy}
//                   >
//                     Hapus
//                   </button>
//                 ) : null}
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <div className="rounded-lg border border-dashed border-slate-200 bg-white/40 p-3 text-sm text-slate-500">
//             {emptyPlaceholder ?? "Belum ada file."}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // "use client";
// // import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
// // import clsx from "clsx";
// // import { formatBytes, validateAndMergeFiles } from "@/lib/uploadUtils";
// // import { PaperclipIcon, XIcon, pickFileIcon } from "@/lib/fileIcons";

// // // cloning from components/form/MultiFileUpload.tsx
// // // hanya penambahan fitur preview image untuk file lokal dan dari URL
// // // dan beberapa penyesuaian default props dan style agar sesuai kebutuhan internal LintasLOG
// // // dan independent upload function

// // export type ExistingFileItem = {
// //   id: number;
// //   name: string;
// //   url: string;
// //   mimetype?: string;
// //   groupId?: number;
// // };

// // export type UploadedFileItem = {
// //   id?: number | string;
// //   name: string;
// //   url: string;
// //   mimetype?: string;
// //   size?: number;
// //   groupId?: number;
// //   meta?: Record<string, unknown>;
// // };

// // export type IndMultiFileUploadProps = {
// //   /** UI */
// //   label: string;
// //   hint?: string;
// //   otherTerms?: string;
// //   accept?: string;
// //   maxFiles?: number;
// //   maxFileSizeMB?: number;
// //   allowDuplicates?: boolean;
// //   disabled?: boolean;
// //   droppable?: boolean;
// //   emptyPlaceholder?: React.ReactNode;
// //   className?: string;
// //   showImagePreview?: boolean;

// //   /** Queue (files yang akan di-upload) - bisa controlled atau uncontrolled */
// //   value?: File[];
// //   defaultValue?: File[];
// //   onChange?: (files: File[]) => void;

// //   /** Existing items (file server yg sudah ada, opsional) */
// //   existingItems?: ExistingFileItem[];
// //   existingHeader?: string;
// //   onRemoveExisting?: (item: ExistingFileItem) => void;

// //   /** Uploaded results list (hasil upload) - bisa controlled atau uncontrolled */
// //   uploadedItems?: UploadedFileItem[];
// //   defaultUploadedItems?: UploadedFileItem[];
// //   onUploadedItemsChange?: (items: UploadedFileItem[]) => void;
// //   uploadedHeader?: string;
// //   onRemoveUploaded?: (item: UploadedFileItem) => void | Promise<void>;

// //   /** Upload behavior (independent) */
// //   uploadFiles?: (files: File[]) => Promise<UploadedFileItem[]>;
// //   uploadButtonText?: string;
// //   clearQueueAfterUpload?: boolean;

// //   /** Events */
// //   onReject?: (messages: string[]) => void;
// //   onUploadSuccess?: (newItems: UploadedFileItem[], uploadedFiles: File[]) => void;
// //   onUploadError?: (error: unknown) => void;
// // };

// // function fileKey(f: File) {
// //   return `${f.name}__${f.size}__${f.lastModified}`;
// // }

// // function isImageFile(f: File) {
// //   return f.type.startsWith("image/");
// // }

// // function isImageUrl(url: string) {
// //   const lower = url.toLowerCase();
// //   return (
// //     lower.endsWith(".jpg") ||
// //     lower.endsWith(".jpeg") ||
// //     lower.endsWith(".png") ||
// //     lower.endsWith(".gif") ||
// //     lower.endsWith(".webp") ||
// //     lower.includes("mimetype=image")
// //   );
// // }

// // function dedupeUploaded(items: UploadedFileItem[]) {
// //   const seen = new Set<string>();
// //   const out: UploadedFileItem[] = [];
// //   for (const it of items) {
// //     const k =
// //       it.id != null
// //         ? `id:${String(it.id)}`
// //         : it.url
// //         ? `url:${it.url}`
// //         : `name:${it.name}`;
// //     if (seen.has(k)) continue;
// //     seen.add(k);
// //     out.push(it);
// //   }
// //   return out;
// // }

// // function sameUploaded(a: UploadedFileItem, b: UploadedFileItem) {
// //   if (a.id != null && b.id != null) return String(a.id) === String(b.id);
// //   if (a.url && b.url) return a.url === b.url;
// //   return a.name === b.name;
// // }

// // export default function IndMultiFileUpload({
// //   label,
// //   hint = "Maks. 10 MB per file.",
// //   otherTerms = "",
// //   accept = "",
// //   maxFiles,
// //   maxFileSizeMB = 10,
// //   allowDuplicates = false,
// //   disabled = false,
// //   droppable = true,
// //   emptyPlaceholder,
// //   className,
// //   onReject,
// //   showImagePreview = true,

// //   value,
// //   defaultValue = [],
// //   onChange,

// //   existingItems,
// //   existingHeader,
// //   onRemoveExisting,

// //   uploadedItems,
// //   defaultUploadedItems = [],
// //   onUploadedItemsChange,
// //   uploadedHeader,
// //   onRemoveUploaded,

// //   uploadFiles,
// //   uploadButtonText = "Upload",
// //   clearQueueAfterUpload = true,

// //   onUploadSuccess,
// //   onUploadError,
// // }: IndMultiFileUploadProps) {
// //   /** Controlled/uncontrolled queue */
// //   const [innerFiles, setInnerFiles] = useState<File[]>(defaultValue);
// //   const files = value ?? innerFiles;
// //   const setFiles = onChange ?? setInnerFiles;

// //   /** Controlled/uncontrolled uploaded list */
// //   const [innerUploaded, setInnerUploaded] = useState<UploadedFileItem[]>(
// //     defaultUploadedItems
// //   );
// //   const uploadedList = uploadedItems ?? innerUploaded;
// //   const setUploadedList = onUploadedItemsChange ?? setInnerUploaded;

// //   const inputRef = useRef<HTMLInputElement | null>(null);
// //   const [isDragging, setIsDragging] = useState(false);
// //   const [errors, setErrors] = useState<string[]>([]);
// //   const [isUploading, setIsUploading] = useState(false);

// //   const hasExisting = !!existingItems?.length;
// //   const hasUploaded = !!uploadedList?.length;
// //   const hasNew = files.length > 0;
// //   const isEmpty = !hasExisting && !hasUploaded && !hasNew;

// //   useEffect(() => {
// //     if (errors.length) {
// //       const t = setTimeout(() => setErrors([]), 4000);
// //       return () => clearTimeout(t);
// //     }
// //   }, [errors]);

// //   const pushErrors = useCallback(
// //     (msgs: string[]) => {
// //       if (!msgs.length) return;
// //       setErrors((prev) => [...prev, ...msgs]);
// //       onReject?.(msgs);
// //     },
// //     [onReject]
// //   );

// //   const handleAppendFiles = useCallback(
// //     (incoming: File[]) => {
// //       if (!incoming.length) return;

// //       const { accepted, rejectedMessages } = validateAndMergeFiles(files, incoming, {
// //         maxFileSizeMB,
// //         accept,
// //         allowDuplicates,
// //       });

// //       let finalAccepted = accepted;
// //       const extraErrors: string[] = [];
// //       if (typeof maxFiles === "number" && maxFiles >= 0 && accepted.length > maxFiles) {
// //         finalAccepted = accepted.slice(0, maxFiles);
// //         extraErrors.push(
// //           `Maksimal ${maxFiles} file. ${accepted.length - maxFiles} file lainnya diabaikan.`
// //         );
// //       }

// //       pushErrors([...rejectedMessages, ...extraErrors]);
// //       setFiles(finalAccepted);
// //     },
// //     [accept, allowDuplicates, files, maxFiles, maxFileSizeMB, pushErrors, setFiles]
// //   );

// //   const openPicker = useCallback(() => {
// //     if (disabled) return;
// //     inputRef.current?.click();
// //   }, [disabled]);

// //   const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
// //     const picked = Array.from(e.target.files ?? []);
// //     handleAppendFiles(picked);
// //     if (inputRef.current) inputRef.current.value = "";
// //   };

// //   const removeAt = (idx: number) => {
// //     if (disabled) return;
// //     const next = files.filter((_, i) => i !== idx);
// //     setFiles(next);
// //   };

// //   const clearAll = () => {
// //     if (disabled) return;
// //     setFiles([]);
// //   };

// //   const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
// //     if (!droppable || disabled) return;
// //     e.preventDefault();
// //     setIsDragging(true);
// //   };

// //   const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => {
// //     if (!droppable || disabled) return;
// //     setIsDragging(false);
// //   };

// //   const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
// //     if (!droppable || disabled) return;
// //     e.preventDefault();
// //     setIsDragging(false);
// //     const dropped = Array.from(e.dataTransfer.files ?? []);
// //     handleAppendFiles(dropped);
// //   };

// //   /** thumbs for new local files */
// //   const [thumbs, setThumbs] = useState<Record<string, string>>({});
// //   useEffect(() => {
// //     if (!showImagePreview) return;
// //     const map: Record<string, string> = {};
// //     files.forEach((f) => {
// //       if (isImageFile(f)) map[fileKey(f)] = URL.createObjectURL(f);
// //     });
// //     setThumbs(map);
// //     return () => {
// //       Object.values(map).forEach((url) => URL.revokeObjectURL(url));
// //     };
// //   }, [files, showImagePreview]);

// //   const filesCountInfo = useMemo(() => {
// //     const existingCount = existingItems?.length ?? 0;
// //     const uploadedCount = uploadedList?.length ?? 0;
// //     const total = files.length + existingCount + uploadedCount;

// //     const limitInfo =
// //       typeof maxFiles === "number" && maxFiles >= 0 ? ` / ${maxFiles}` : "";
// //     return `${total}${limitInfo} file`;
// //   }, [files.length, maxFiles, existingItems, uploadedList]);

// //   const doUpload = useCallback(async () => {
// //     if (disabled || isUploading) return;

// //     if (!uploadFiles) {
// //       pushErrors(["uploadFiles prop belum diisi."]);
// //       return;
// //     }
// //     if (!files.length) {
// //       pushErrors(["Tidak ada file untuk di-upload."]);
// //       return;
// //     }

// //     setIsUploading(true);
// //     try {
// //       const newItems = await uploadFiles(files);

// //       // merge + dedupe
// //       const merged = dedupeUploaded([...(uploadedList ?? []), ...(newItems ?? [])]);
// //       setUploadedList(merged);

// //       onUploadSuccess?.(newItems ?? [], files);

// //       if (clearQueueAfterUpload) setFiles([]);
// //     } catch (err) {
// //       onUploadError?.(err);

// //       const msg =
// //         err instanceof Error ? err.message : "Upload gagal. Coba lagi.";
// //       pushErrors([msg]);
// //     } finally {
// //       setIsUploading(false);
// //     }
// //   }, [
// //     clearQueueAfterUpload,
// //     disabled,
// //     files,
// //     isUploading,
// //     onUploadError,
// //     onUploadSuccess,
// //     pushErrors,
// //     setFiles,
// //     setUploadedList,
// //     uploadFiles,
// //     uploadedList,
// //   ]);

// //   const removeUploaded = useCallback(
// //     async (item: UploadedFileItem) => {
// //       if (disabled || isUploading) return;
// //       if (!onRemoveUploaded) return;
// //       try {
// //         await onRemoveUploaded(item);
// //         const next = (uploadedList ?? []).filter((x) => !sameUploaded(x, item));
// //         setUploadedList(next);
// //       } catch (err) {
// //         const msg =
// //           err instanceof Error ? err.message : "Gagal menghapus file. Coba lagi.";
// //         pushErrors([msg]);
// //       }
// //     },
// //     [disabled, isUploading, onRemoveUploaded, pushErrors, setUploadedList, uploadedList]
// //   );

// //   const canUpload = !!uploadFiles && files.length > 0 && !disabled && !isUploading;

// //   return (
// //     <div className={clsx(className)}>
// //       <label className="mt-2 block text-sm font-extrabold text-black">{label}</label>

// //       <div className="mt-2 rounded-2xl border-2 border-dashed font-extrabold bg-primary/10 transition">
// //         <input
// //           ref={inputRef}
// //           type="file"
// //           multiple
// //           accept={accept}
// //           disabled={disabled}
// //           onChange={onInputChange}
// //           className="hidden"
// //         />

// //         <div
// //           role="button"
// //           tabIndex={0}
// //           onClick={openPicker}
// //           onKeyDown={(e) =>
// //             e.key === "Enter" || e.key === " " ? openPicker() : null
// //           }
// //           onDragOver={onDragOver}
// //           onDragLeave={onDragLeave}
// //           onDrop={onDrop}
// //           className={clsx(
// //             "flex items-start justify-between gap-3 px-4 py-3 rounded-2xl",
// //             droppable && !disabled && "hover:bg-gray-50 active:scale-[0.99]",
// //             isDragging && "border-primary bg-primary/5",
// //             disabled && "cursor-not-allowed opacity-60"
// //           )}
// //           aria-disabled={disabled}
// //         >
// //           {/* LEFT */}
// //           <div className="flex flex-1 min-w-0 items-start gap-3">
// //             <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300">
// //               <PaperclipIcon className="h-4 w-4" />
// //             </div>

// //             <div className="min-w-0 w-full">
// //               <div className="text-sm font-medium text-gray-800 break-words">
// //                 {disabled ? "Upload dimatikan" : "Klik untuk pilih atau tarik file ke sini"}
// //               </div>

// //               <div className="text-xs font-extralight text-gray-500 break-words">
// //                 {hint || "Maks. 10 MB per file."}

// //                 {accept && (
// //                   <>
// //                     &nbsp;•&nbsp; Tipe: <span className="break-all">{accept}</span>
// //                   </>
// //                 )}

// //                 {otherTerms && (
// //                   <div className="mt-6 text-md whitespace-pre-line leading-relaxed">
// //                     {otherTerms || ""}
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           </div>

// //           {/* RIGHT */}
// //           <div className="flex items-center gap-2 shrink-0">
// //             <span className="text-xs text-gray-500 truncate max-w-[10rem]">
// //               {filesCountInfo}
// //             </span>

// //             {!!files.length && (
// //               <button
// //                 type="button"
// //                 onClick={(e) => {
// //                   e.stopPropagation();
// //                   clearAll();
// //                 }}
// //                 disabled={disabled || isUploading}
// //                 className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
// //                 title="Hapus semua file antrian"
// //               >
// //                 <XIcon className="mr-1 h-3.5 w-3.5" />
// //                 Clear
// //               </button>
// //             )}

// //             {!!uploadFiles && (
// //               <button
// //                 type="button"
// //                 onClick={(e) => {
// //                   e.stopPropagation();
// //                   doUpload();
// //                 }}
// //                 disabled={!canUpload}
// //                 className={clsx(
// //                   "inline-flex items-center rounded-xl border px-2 py-1 text-xs",
// //                   canUpload
// //                     ? "border-primary bg-primary text-white hover:opacity-90"
// //                     : "border-gray-200 bg-gray-100 text-gray-500"
// //                 )}
// //                 title={uploadButtonText}
// //               >
// //                 {isUploading ? (
// //                   <>
// //                     <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
// //                     Uploading
// //                   </>
// //                 ) : (
// //                   uploadButtonText
// //                 )}
// //               </button>
// //             )}
// //           </div>
// //         </div>

// //         {/* LISTS */}
// //         <div className="px-3 pb-3">
// //           {isEmpty ? (
// //             <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
// //               {emptyPlaceholder ?? "Belum ada file."}
// //             </div>
// //           ) : (
// //             <>
// //               {/* Uploaded results */}
// //               {hasUploaded && (
// //                 <>
// //                   <div className="mt-3 text-xs font-semibold text-gray-600">
// //                     {uploadedHeader ?? "Hasil upload"}
// //                   </div>
// //                   <ul className="mt-2 space-y-2">
// //                     {uploadedList!.map((item) => {
// //                       const Icon = pickFileIcon(item.name, item.mimetype ?? "");
// //                       const img =
// //                         showImagePreview &&
// //                         ((item.mimetype?.startsWith("image/") ?? false) ||
// //                           isImageUrl(item.url));

// //                       const key =
// //                         item.id != null ? `uploaded-${String(item.id)}` : `uploaded-${item.url}`;

// //                       return (
// //                         <li
// //                           key={key}
// //                           className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// //                         >
// //                           <div className="flex flex-1 min-w-0 items-center gap-3">
// //                             {img ? (
// //                               <img
// //                                 src={item.url}
// //                                 alt={item.name}
// //                                 className="h-10 w-10 shrink-0 rounded-lg object-cover"
// //                               />
// //                             ) : (
// //                               <Icon className="h-5 w-5 shrink-0" />
// //                             )}

// //                             <div className="min-w-0 flex-1">
// //                               <a
// //                                 href={item.url}
// //                                 target="_blank"
// //                                 rel="noopener noreferrer"
// //                                 className="truncate text-sm font-medium text-primary-700 hover:underline"
// //                               >
// //                                 {item.name}
// //                               </a>
// //                               <div className="text-[11px] text-gray-500">
// //                                 {item.mimetype || "uploaded file"}
// //                                 {typeof item.size === "number" ? ` • ${formatBytes(item.size)}` : ""}
// //                               </div>
// //                             </div>
// //                           </div>

// //                           {onRemoveUploaded && (
// //                             <button
// //                               type="button"
// //                               onClick={async () => removeUploaded(item)}
// //                               disabled={disabled || isUploading}
// //                               className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// //                               title="Hapus file ini"
// //                             >
// //                               <XIcon className="h-4 w-4" />
// //                             </button>
// //                           )}
// //                         </li>
// //                       );
// //                     })}
// //                   </ul>
// //                 </>
// //               )}

// //               {/* Existing items (server) */}
// //               {hasExisting && (
// //                 <>
// //                   <div className="mt-3 text-xs font-semibold text-gray-600">
// //                     {existingHeader ?? "File terlampir (server)"}
// //                   </div>
// //                   <ul className="mt-2 space-y-2">
// //                     {existingItems!.map((item) => {
// //                       const Icon = pickFileIcon(item.name, item.mimetype ?? "");
// //                       const img =
// //                         showImagePreview &&
// //                         (item.mimetype?.startsWith("image/") || isImageUrl(item.url));

// //                       return (
// //                         <li
// //                           key={`existing-${item.id}`}
// //                           className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// //                         >
// //                           <div className="flex flex-1 min-w-0 items-center gap-3">
// //                             {img ? (
// //                               <img
// //                                 src={item.url}
// //                                 alt={item.name}
// //                                 className="h-10 w-10 shrink-0 rounded-lg object-cover"
// //                               />
// //                             ) : (
// //                               <Icon className="h-5 w-5 shrink-0" />
// //                             )}

// //                             <div className="min-w-0 flex-1">
// //                               <a
// //                                 href={item.url}
// //                                 target="_blank"
// //                                 rel="noopener noreferrer"
// //                                 className="truncate text-sm font-medium text-primary-700 hover:underline"
// //                               >
// //                                 {item.name}
// //                               </a>
// //                               <div className="text-[11px] text-gray-500">
// //                                 {item.mimetype || "server file"}
// //                               </div>
// //                             </div>
// //                           </div>

// //                           {onRemoveExisting && (
// //                             <button
// //                               type="button"
// //                               onClick={() => onRemoveExisting(item)}
// //                               disabled={disabled || isUploading}
// //                               className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// //                               title="Hapus file ini dari server"
// //                             >
// //                               <XIcon className="h-4 w-4" />
// //                             </button>
// //                           )}
// //                         </li>
// //                       );
// //                     })}
// //                   </ul>
// //                 </>
// //               )}

// //               {/* Queue files (new/local) */}
// //               {hasNew && (
// //                 <ul className="mt-3 space-y-2">
// //                   {files.map((f, idx) => {
// //                     const Icon = pickFileIcon(f.name, f.type);
// //                     const key = fileKey(f);
// //                     return (
// //                       <li
// //                         key={key}
// //                         className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// //                       >
// //                         <div className="flex flex-1 min-w-0 items-center gap-3">
// //                           {showImagePreview && isImageFile(f) ? (
// //                             <img
// //                               src={thumbs[key]}
// //                               alt={f.name}
// //                               className="h-10 w-10 shrink-0 rounded-lg object-cover"
// //                             />
// //                           ) : (
// //                             <Icon className="h-5 w-5 shrink-0" />
// //                           )}

// //                           <div className="min-w-0 flex-1">
// //                             <div className="truncate text-sm font-medium text-gray-800">
// //                               {f.name}
// //                             </div>
// //                             <div className="text-xs text-gray-500">
// //                               {formatBytes(f.size)}
// //                             </div>
// //                           </div>
// //                         </div>

// //                         <button
// //                           type="button"
// //                           onClick={() => removeAt(idx)}
// //                           disabled={disabled || isUploading}
// //                           aria-label={`Remove ${f.name}`}
// //                           title="Hapus file antrian ini"
// //                           className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// //                         >
// //                           <XIcon className="h-4 w-4" />
// //                         </button>
// //                       </li>
// //                     );
// //                   })}
// //                 </ul>
// //               )}
// //             </>
// //           )}

// //           {errors.length > 0 && (
// //             <ul className="mt-2 space-y-1 text-xs text-red-600">
// //               {errors.map((msg, i) => (
// //                 <li key={i}>• {msg}</li>
// //               ))}
// //             </ul>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // // "use client";
// // // import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
// // // import clsx from "clsx";
// // // import { formatBytes, validateAndMergeFiles } from "@/lib/uploadUtils";
// // // import { PaperclipIcon, XIcon, pickFileIcon } from "@/lib/fileIcons";

// // // // cloning from components/form/MultiFileUpload.tsx
// // // // hanya penambahan fitur preview image untuk file lokal dan dari URL
// // // // dan beberapa penyesuaian default props dan style agar sesuai kebutuhan internal LintasLOG
// // // // dan independent upload function

// // // export type ExistingFileItem = {
// // //   id: number;
// // //   name: string;
// // //   url: string;
// // //   mimetype?: string;
// // //   groupId?: number;
// // // };

// // // export type UploadedFileItem = {
// // //   id?: number | string;
// // //   name: string;
// // //   url: string;
// // //   mimetype?: string;
// // //   size?: number;
// // //   groupId?: number;
// // //   meta?: Record<string, unknown>;
// // // };

// // // type IndMultiFileUploadProps = {
// // //   /** UI */
// // //   label: string;
// // //   hint?: string;
// // //   otherTerms?: string;
// // //   accept?: string;
// // //   maxFiles?: number;
// // //   maxFileSizeMB?: number;
// // //   allowDuplicates?: boolean;
// // //   disabled?: boolean;
// // //   droppable?: boolean;
// // //   emptyPlaceholder?: React.ReactNode;
// // //   className?: string;
// // //   showImagePreview?: boolean;

// // //   /** Queue (files yang akan di-upload) - bisa controlled atau uncontrolled */
// // //   value?: File[];
// // //   defaultValue?: File[];
// // //   onChange?: (files: File[]) => void;

// // //   /** Existing items (file server yg sudah ada, opsional) */
// // //   existingItems?: ExistingFileItem[];
// // //   existingHeader?: string;
// // //   onRemoveExisting?: (item: ExistingFileItem) => void;

// // //   /** Uploaded results list (hasil upload) - bisa controlled atau uncontrolled */
// // //   uploadedItems?: UploadedFileItem[];
// // //   defaultUploadedItems?: UploadedFileItem[];
// // //   onUploadedItemsChange?: (items: UploadedFileItem[]) => void;
// // //   uploadedHeader?: string;
// // //   onRemoveUploaded?: (item: UploadedFileItem) => void | Promise<void>;

// // //   /** Upload behavior (independent) */
// // //   uploadFiles?: (files: File[]) => Promise<UploadedFileItem[]>;
// // //   uploadButtonText?: string;
// // //   clearQueueAfterUpload?: boolean;

// // //   /** Events */
// // //   onReject?: (messages: string[]) => void;
// // //   onUploadSuccess?: (newItems: UploadedFileItem[], uploadedFiles: File[]) => void;
// // //   onUploadError?: (error: unknown) => void;
// // // };

// // // function fileKey(f: File) {
// // //   return `${f.name}__${f.size}__${f.lastModified}`;
// // // }

// // // function isImageFile(f: File) {
// // //   return f.type.startsWith("image/");
// // // }

// // // function isImageUrl(url: string) {
// // //   const lower = url.toLowerCase();
// // //   return (
// // //     lower.endsWith(".jpg") ||
// // //     lower.endsWith(".jpeg") ||
// // //     lower.endsWith(".png") ||
// // //     lower.endsWith(".gif") ||
// // //     lower.endsWith(".webp") ||
// // //     lower.includes("mimetype=image")
// // //   );
// // // }

// // // function dedupeUploaded(items: UploadedFileItem[]) {
// // //   const seen = new Set<string>();
// // //   const out: UploadedFileItem[] = [];
// // //   for (const it of items) {
// // //     const k =
// // //       it.id != null
// // //         ? `id:${String(it.id)}`
// // //         : it.url
// // //         ? `url:${it.url}`
// // //         : `name:${it.name}`;
// // //     if (seen.has(k)) continue;
// // //     seen.add(k);
// // //     out.push(it);
// // //   }
// // //   return out;
// // // }

// // // export default function IndMultiFileUpload({
// // //   label,
// // //   hint = "Maks. 10 MB per file.",
// // //   otherTerms = "",
// // //   accept = "",
// // //   maxFiles,
// // //   maxFileSizeMB = 10,
// // //   allowDuplicates = false,
// // //   disabled = false,
// // //   droppable = true,
// // //   emptyPlaceholder,
// // //   className,
// // //   onReject,
// // //   showImagePreview = true,

// // //   value,
// // //   defaultValue = [],
// // //   onChange,

// // //   existingItems,
// // //   existingHeader,
// // //   onRemoveExisting,

// // //   uploadedItems,
// // //   defaultUploadedItems = [],
// // //   onUploadedItemsChange,
// // //   uploadedHeader,
// // //   onRemoveUploaded,

// // //   uploadFiles,
// // //   uploadButtonText = "Upload",
// // //   clearQueueAfterUpload = true,

// // //   onUploadSuccess,
// // //   onUploadError,
// // // }: IndMultiFileUploadProps) {
// // //   /** Controlled/uncontrolled queue */
// // //   const [innerFiles, setInnerFiles] = useState<File[]>(defaultValue);
// // //   const files = value ?? innerFiles;
// // //   const setFiles = onChange ?? setInnerFiles;

// // //   /** Controlled/uncontrolled uploaded list */
// // //   const [innerUploaded, setInnerUploaded] = useState<UploadedFileItem[]>(
// // //     defaultUploadedItems
// // //   );
// // //   const uploadedList = uploadedItems ?? innerUploaded;
// // //   const setUploadedList = onUploadedItemsChange ?? setInnerUploaded;

// // //   const inputRef = useRef<HTMLInputElement | null>(null);
// // //   const [isDragging, setIsDragging] = useState(false);
// // //   const [errors, setErrors] = useState<string[]>([]);
// // //   const [isUploading, setIsUploading] = useState(false);

// // //   const hasExisting = !!existingItems?.length;
// // //   const hasUploaded = !!uploadedList?.length;
// // //   const hasNew = files.length > 0;
// // //   const isEmpty = !hasExisting && !hasUploaded && !hasNew;

// // //   useEffect(() => {
// // //     if (errors.length) {
// // //       const t = setTimeout(() => setErrors([]), 4000);
// // //       return () => clearTimeout(t);
// // //     }
// // //   }, [errors]);

// // //   const pushErrors = useCallback(
// // //     (msgs: string[]) => {
// // //       if (!msgs.length) return;
// // //       setErrors((prev) => [...prev, ...msgs]);
// // //       onReject?.(msgs);
// // //     },
// // //     [onReject]
// // //   );

// // //   const handleAppendFiles = useCallback(
// // //     (incoming: File[]) => {
// // //       if (!incoming.length) return;

// // //       const { accepted, rejectedMessages } = validateAndMergeFiles(files, incoming, {
// // //         maxFileSizeMB,
// // //         accept,
// // //         allowDuplicates,
// // //       });

// // //       let finalAccepted = accepted;
// // //       const extraErrors: string[] = [];
// // //       if (typeof maxFiles === "number" && maxFiles >= 0 && accepted.length > maxFiles) {
// // //         finalAccepted = accepted.slice(0, maxFiles);
// // //         extraErrors.push(
// // //           `Maksimal ${maxFiles} file. ${accepted.length - maxFiles} file lainnya diabaikan.`
// // //         );
// // //       }

// // //       pushErrors([...rejectedMessages, ...extraErrors]);
// // //       setFiles(finalAccepted);
// // //     },
// // //     [accept, allowDuplicates, files, maxFiles, maxFileSizeMB, pushErrors, setFiles]
// // //   );

// // //   const openPicker = useCallback(() => {
// // //     if (disabled) return;
// // //     inputRef.current?.click();
// // //   }, [disabled]);

// // //   const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
// // //     const picked = Array.from(e.target.files ?? []);
// // //     handleAppendFiles(picked);
// // //     if (inputRef.current) inputRef.current.value = "";
// // //   };

// // //   const removeAt = (idx: number) => {
// // //     if (disabled) return;
// // //     const next = files.filter((_, i) => i !== idx);
// // //     setFiles(next);
// // //   };

// // //   const clearAll = () => {
// // //     if (disabled) return;
// // //     setFiles([]);
// // //   };

// // //   const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
// // //     if (!droppable || disabled) return;
// // //     e.preventDefault();
// // //     setIsDragging(true);
// // //   };

// // //   const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => {
// // //     if (!droppable || disabled) return;
// // //     setIsDragging(false);
// // //   };

// // //   const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
// // //     if (!droppable || disabled) return;
// // //     e.preventDefault();
// // //     setIsDragging(false);
// // //     const dropped = Array.from(e.dataTransfer.files ?? []);
// // //     handleAppendFiles(dropped);
// // //   };

// // //   /** thumbs for new local files */
// // //   const [thumbs, setThumbs] = useState<Record<string, string>>({});
// // //   useEffect(() => {
// // //     if (!showImagePreview) return;
// // //     const map: Record<string, string> = {};
// // //     files.forEach((f) => {
// // //       if (isImageFile(f)) map[fileKey(f)] = URL.createObjectURL(f);
// // //     });
// // //     setThumbs(map);
// // //     return () => {
// // //       Object.values(map).forEach((url) => URL.revokeObjectURL(url));
// // //     };
// // //   }, [files, showImagePreview]);

// // //   const filesCountInfo = useMemo(() => {
// // //     const existingCount = existingItems?.length ?? 0;
// // //     const uploadedCount = uploadedList?.length ?? 0;
// // //     const total = files.length + existingCount + uploadedCount;

// // //     const limitInfo =
// // //       typeof maxFiles === "number" && maxFiles >= 0 ? ` / ${maxFiles}` : "";
// // //     return `${total}${limitInfo} file`;
// // //   }, [files.length, maxFiles, existingItems, uploadedList]);

// // //   const doUpload = useCallback(async () => {
// // //     if (disabled || isUploading) return;

// // //     if (!uploadFiles) {
// // //       pushErrors(["uploadFiles prop belum diisi."]);
// // //       return;
// // //     }
// // //     if (!files.length) {
// // //       pushErrors(["Tidak ada file untuk di-upload."]);
// // //       return;
// // //     }

// // //     setIsUploading(true);
// // //     try {
// // //       const newItems = await uploadFiles(files);

// // //       // merge + dedupe
// // //       const merged = dedupeUploaded([...(uploadedList ?? []), ...(newItems ?? [])]);
// // //       setUploadedList(merged);

// // //       onUploadSuccess?.(newItems ?? [], files);

// // //       if (clearQueueAfterUpload) setFiles([]);
// // //     } catch (err) {
// // //       onUploadError?.(err);

// // //       const msg =
// // //         err instanceof Error ? err.message : "Upload gagal. Coba lagi.";
// // //       pushErrors([msg]);
// // //     } finally {
// // //       setIsUploading(false);
// // //     }
// // //   }, [
// // //     clearQueueAfterUpload,
// // //     disabled,
// // //     files,
// // //     isUploading,
// // //     onUploadError,
// // //     onUploadSuccess,
// // //     pushErrors,
// // //     setFiles,
// // //     setUploadedList,
// // //     uploadFiles,
// // //     uploadedList,
// // //   ]);

// // //   const canUpload = !!uploadFiles && files.length > 0 && !disabled && !isUploading;

// // //   return (
// // //     <div className={clsx(className)}>
// // //       <label className="mt-2 block text-sm font-extrabold text-black">{label}</label>

// // //       <div className="mt-2 rounded-2xl border-2 border-dashed font-extrabold bg-primary/10 transition">
// // //         <input
// // //           ref={inputRef}
// // //           type="file"
// // //           multiple
// // //           accept={accept}
// // //           disabled={disabled}
// // //           onChange={onInputChange}
// // //           className="hidden"
// // //         />

// // //         <div
// // //           role="button"
// // //           tabIndex={0}
// // //           onClick={openPicker}
// // //           onKeyDown={(e) =>
// // //             e.key === "Enter" || e.key === " " ? openPicker() : null
// // //           }
// // //           onDragOver={onDragOver}
// // //           onDragLeave={onDragLeave}
// // //           onDrop={onDrop}
// // //           className={clsx(
// // //             "flex items-start justify-between gap-3 px-4 py-3 rounded-2xl",
// // //             droppable && !disabled && "hover:bg-gray-50 active:scale-[0.99]",
// // //             isDragging && "border-primary bg-primary/5",
// // //             disabled && "cursor-not-allowed opacity-60"
// // //           )}
// // //           aria-disabled={disabled}
// // //         >
// // //           {/* LEFT */}
// // //           <div className="flex flex-1 min-w-0 items-start gap-3">
// // //             <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300">
// // //               <PaperclipIcon className="h-4 w-4" />
// // //             </div>

// // //             <div className="min-w-0 w-full">
// // //               <div className="text-sm font-medium text-gray-800 break-words">
// // //                 {disabled ? "Upload dimatikan" : "Klik untuk pilih atau tarik file ke sini"}
// // //               </div>

// // //               <div className="text-xs font-extralight text-gray-500 break-words">
// // //                 {hint || "Maks. 10 MB per file."}

// // //                 {accept && (
// // //                   <>
// // //                     &nbsp;•&nbsp; Tipe: <span className="break-all">{accept}</span>
// // //                   </>
// // //                 )}

// // //                 {otherTerms && (
// // //                   <div className="mt-6 text-md whitespace-pre-line leading-relaxed">
// // //                     {otherTerms || ""}
// // //                   </div>
// // //                 )}
// // //               </div>
// // //             </div>
// // //           </div>

// // //           {/* RIGHT */}
// // //           <div className="flex items-center gap-2 shrink-0">
// // //             <span className="text-xs text-gray-500 truncate max-w-[10rem]">
// // //               {filesCountInfo}
// // //             </span>

// // //             {!!files.length && (
// // //               <button
// // //                 type="button"
// // //                 onClick={(e) => {
// // //                   e.stopPropagation();
// // //                   clearAll();
// // //                 }}
// // //                 disabled={disabled || isUploading}
// // //                 className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-60"
// // //                 title="Hapus semua file antrian"
// // //               >
// // //                 <XIcon className="mr-1 h-3.5 w-3.5" />
// // //                 Clear
// // //               </button>
// // //             )}

// // //             {!!uploadFiles && (
// // //               <button
// // //                 type="button"
// // //                 onClick={(e) => {
// // //                   e.stopPropagation();
// // //                   doUpload();
// // //                 }}
// // //                 disabled={!canUpload}
// // //                 className={clsx(
// // //                   "inline-flex items-center rounded-xl border px-2 py-1 text-xs",
// // //                   canUpload
// // //                     ? "border-primary bg-primary text-white hover:opacity-90"
// // //                     : "border-gray-200 bg-gray-100 text-gray-500"
// // //                 )}
// // //                 title={uploadButtonText}
// // //               >
// // //                 {isUploading ? (
// // //                   <>
// // //                     <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
// // //                     Uploading
// // //                   </>
// // //                 ) : (
// // //                   uploadButtonText
// // //                 )}
// // //               </button>
// // //             )}
// // //           </div>
// // //         </div>

// // //         {/* LISTS */}
// // //         <div className="px-3 pb-3">
// // //           {isEmpty ? (
// // //             <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
// // //               {emptyPlaceholder ?? "Belum ada file."}
// // //             </div>
// // //           ) : (
// // //             <>
// // //               {/* Uploaded results */}
// // //               {hasUploaded && (
// // //                 <>
// // //                   <div className="mt-3 text-xs font-semibold text-gray-600">
// // //                     {uploadedHeader ?? "Hasil upload"}
// // //                   </div>
// // //                   <ul className="mt-2 space-y-2">
// // //                     {uploadedList!.map((item) => {
// // //                       const Icon = pickFileIcon(item.name, item.mimetype ?? "");
// // //                       const img =
// // //                         showImagePreview &&
// // //                         ((item.mimetype?.startsWith("image/") ?? false) ||
// // //                           isImageUrl(item.url));

// // //                       const key =
// // //                         item.id != null ? `uploaded-${String(item.id)}` : `uploaded-${item.url}`;

// // //                       return (
// // //                         <li
// // //                           key={key}
// // //                           className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// // //                         >
// // //                           <div className="flex flex-1 min-w-0 items-center gap-3">
// // //                             {img ? (
// // //                               <img
// // //                                 src={item.url}
// // //                                 alt={item.name}
// // //                                 className="h-10 w-10 shrink-0 rounded-lg object-cover"
// // //                               />
// // //                             ) : (
// // //                               <Icon className="h-5 w-5 shrink-0" />
// // //                             )}

// // //                             <div className="min-w-0 flex-1">
// // //                               <a
// // //                                 href={item.url}
// // //                                 target="_blank"
// // //                                 rel="noopener noreferrer"
// // //                                 className="truncate text-sm font-medium text-primary-700 hover:underline"
// // //                               >
// // //                                 {item.name}
// // //                               </a>
// // //                               <div className="text-[11px] text-gray-500">
// // //                                 {item.mimetype || "uploaded file"}
// // //                                 {typeof item.size === "number" ? ` • ${formatBytes(item.size)}` : ""}
// // //                               </div>
// // //                             </div>
// // //                           </div>

// // //                           {onRemoveUploaded && (
// // //                             <button
// // //                               type="button"
// // //                               onClick={async () => onRemoveUploaded(item)}
// // //                               disabled={disabled || isUploading}
// // //                               className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// // //                               title="Hapus file ini"
// // //                             >
// // //                               <XIcon className="h-4 w-4" />
// // //                             </button>
// // //                           )}
// // //                         </li>
// // //                       );
// // //                     })}
// // //                   </ul>
// // //                 </>
// // //               )}

// // //               {/* Existing items (server) */}
// // //               {hasExisting && (
// // //                 <>
// // //                   <div className="mt-3 text-xs font-semibold text-gray-600">
// // //                     {existingHeader ?? "File terlampir (server)"}
// // //                   </div>
// // //                   <ul className="mt-2 space-y-2">
// // //                     {existingItems!.map((item) => {
// // //                       const Icon = pickFileIcon(item.name, item.mimetype ?? "");
// // //                       const img =
// // //                         showImagePreview &&
// // //                         (item.mimetype?.startsWith("image/") || isImageUrl(item.url));

// // //                       return (
// // //                         <li
// // //                           key={`existing-${item.id}`}
// // //                           className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// // //                         >
// // //                           <div className="flex flex-1 min-w-0 items-center gap-3">
// // //                             {img ? (
// // //                               <img
// // //                                 src={item.url}
// // //                                 alt={item.name}
// // //                                 className="h-10 w-10 shrink-0 rounded-lg object-cover"
// // //                               />
// // //                             ) : (
// // //                               <Icon className="h-5 w-5 shrink-0" />
// // //                             )}

// // //                             <div className="min-w-0 flex-1">
// // //                               <a
// // //                                 href={item.url}
// // //                                 target="_blank"
// // //                                 rel="noopener noreferrer"
// // //                                 className="truncate text-sm font-medium text-primary-700 hover:underline"
// // //                               >
// // //                                 {item.name}
// // //                               </a>
// // //                               <div className="text-[11px] text-gray-500">
// // //                                 {item.mimetype || "server file"}
// // //                               </div>
// // //                             </div>
// // //                           </div>

// // //                           {onRemoveExisting && (
// // //                             <button
// // //                               type="button"
// // //                               onClick={() => onRemoveExisting(item)}
// // //                               disabled={disabled || isUploading}
// // //                               className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// // //                               title="Hapus file ini dari server"
// // //                             >
// // //                               <XIcon className="h-4 w-4" />
// // //                             </button>
// // //                           )}
// // //                         </li>
// // //                       );
// // //                     })}
// // //                   </ul>
// // //                 </>
// // //               )}

// // //               {/* Queue files (new/local) */}
// // //               {hasNew && (
// // //                 <ul className="mt-3 space-y-2">
// // //                   {files.map((f, idx) => {
// // //                     const Icon = pickFileIcon(f.name, f.type);
// // //                     const key = fileKey(f);
// // //                     return (
// // //                       <li
// // //                         key={key}
// // //                         className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
// // //                       >
// // //                         <div className="flex flex-1 min-w-0 items-center gap-3">
// // //                           {showImagePreview && isImageFile(f) ? (
// // //                             <img
// // //                               src={thumbs[key]}
// // //                               alt={f.name}
// // //                               className="h-10 w-10 shrink-0 rounded-lg object-cover"
// // //                             />
// // //                           ) : (
// // //                             <Icon className="h-5 w-5 shrink-0" />
// // //                           )}

// // //                           <div className="min-w-0 flex-1">
// // //                             <div className="truncate text-sm font-medium text-gray-800">
// // //                               {f.name}
// // //                             </div>
// // //                             <div className="text-xs text-gray-500">
// // //                               {formatBytes(f.size)}
// // //                             </div>
// // //                           </div>
// // //                         </div>

// // //                         <button
// // //                           type="button"
// // //                           onClick={() => removeAt(idx)}
// // //                           disabled={disabled || isUploading}
// // //                           aria-label={`Remove ${f.name}`}
// // //                           title="Hapus file antrian ini"
// // //                           className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
// // //                         >
// // //                           <XIcon className="h-4 w-4" />
// // //                         </button>
// // //                       </li>
// // //                     );
// // //                   })}
// // //                 </ul>
// // //               )}
// // //             </>
// // //           )}

// // //           {errors.length > 0 && (
// // //             <ul className="mt-2 space-y-1 text-xs text-red-600">
// // //               {errors.map((msg, i) => (
// // //                 <li key={i}>• {msg}</li>
// // //               ))}
// // //             </ul>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }
