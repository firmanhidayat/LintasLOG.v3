/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ============================================================
 * IndMultiFileUpload (TMS/Odoo Document Attachments)
 * ============================================================
 * Flow (sesuai requirement):
 * 1) CREATE + upload pertama:
 *    POST {baseUrl}?doc_type=...  (multipart/form-data: files[])
 *    -> response { id, name, doc_type, attachments[] }
 *
 * 2) ADD file berikutnya:
 *    POST {baseUrl}/{id}          (multipart/form-data: files[])
 *    -> response { id, ... attachments[] }
 *
 * 3) LIST:
 *    GET  {baseUrl}/{id}
 *
 * 4) DELETE:
 *    DELETE {baseUrl}/{id}/attachments/{attachmentId}
 *
 * Catatan:
 * - Jangan set Content-Type untuk multipart (biarkan browser).
 * - URL attachment dari backend biasanya relative (/web/content/...) -> akan di-resolve pakai origin baseUrl.
 */

export type TmsAttachment = {
  id: number | string;
  name: string;
  url: string;
  mimetype?: string;
  res_model?: string;
  res_id?: number | string;
  access_token?: string;
  [k: string]: unknown;
};

export type TmsAttachmentGroup = {
  id: number | string;
  name: string;
  doc_type: string;
  attachments: TmsAttachment[];
  [k: string]: unknown;
};

export type UploadedFileItem = {
  id: number | string;
  name: string;
  url: string; // resolved absolute/relative
  mimetype?: string;
  groupId: number | string;
  meta?: Record<string, unknown>;
};

type SetStateLike<T> = (v: React.SetStateAction<T>) => void;

export type IndMultiFileUploadProps = {
  /** UI */
  label: string;
  hint?: string;
  className?: string;
  accept?: string;
  droppable?: boolean;
  disabled?: boolean;
  showImagePreview?: boolean;
  emptyPlaceholder?: React.ReactNode;

  /** Validation */
  maxFiles?: number;
  maxFileSizeMB?: number;
  allowDuplicates?: boolean;

  /**
   * Queue (optional controlled)
   */
  value?: File[];
  defaultValue?: File[];
  onChange?: SetStateLike<File[]>;

  /**
   * Uploaded items (optional controlled)
   */
  uploadedItems?: UploadedFileItem[];
  defaultUploadedItems?: UploadedFileItem[];
  onUploadedItemsChange?: SetStateLike<UploadedFileItem[]>;
  uploadedHeader?: string;

  /** Behaviour */
  autoUpload?: boolean;
  clearQueueAfterUpload?: boolean;
  uploadButtonText?: string;

  /**
   * ==========================
   * TMS API configuration
   * ==========================
   */
  /** doc_type wajib */
  docType: string;

  /**
   * id group (document-attachments/{id})
   * - Kalau sudah ada, komponen auto GET list (loadOnMount)
   * - Kalau null, akan dibuat saat upload pertama.
   */
  groupId?: number | string | null;

  /**
   * Dipanggil ketika groupId berubah (setelah create/upload),
   * atau ketika refresh list (optional group passed).
   */
  onGroupIdChange?: (nextId: number | string | null, group?: TmsAttachmentGroup | null) => void;

  /** Dipanggil ketika komponen berhasil load group (GET/POST). */
  onGroupLoaded?: (group: TmsAttachmentGroup) => void;

  /**
   * Base URL:
   * contoh: https://odoodev.linitekno.com/api-tms/document-attachments
   * default: process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL || "/api-tms/document-attachments"
   */
  documentAttachmentsUrl?: string;

  /**
   * Extra headers (mis: Authorization).
   * Jangan isi "Content-Type" untuk multipart.
   */
  requestHeaders?: Record<string, string>;

  /**
   * credentials:
   * - true: include cookie (default) -> cocok kalau auth via cookie/session
   * - false: same-origin
   */
  withCredentials?: boolean;

  /** Auto load list ketika groupId tersedia */
  loadOnMount?: boolean;

  /** Callback umum */
  onReject?: (messages: string[]) => void;
  onUploadSuccess?: (newItems: UploadedFileItem[], uploadedFiles: File[], group: TmsAttachmentGroup) => void;
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

function uniqById(items: UploadedFileItem[]) {
  const map = new Map<string, UploadedFileItem>();
  for (const it of items) map.set(String(it.id), it);
  return Array.from(map.values());
}

async function readResponseError(res: Response) {
  const fallback = `${res.status} ${res.statusText}`.trim();
  try {
    const text = await res.text();
    if (!text) return fallback;

    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const msg =
        (typeof json.message === "string" && json.message) ||
        (typeof json.error === "string" && json.error) ||
        (typeof json.detail === "string" && json.detail);
      return msg ? `${fallback} - ${msg}` : `${fallback} - ${text}`;
    } catch {
      return `${fallback} - ${text}`;
    }
  } catch {
    return fallback;
  }
}

export default function IndMultiFileUpload(props: IndMultiFileUploadProps) {
  const {
    // UI
    label,
    hint = "Upload file.",
    className,
    accept = "",
    droppable = true,
    disabled = false,
    showImagePreview = true,
    emptyPlaceholder,

    // Validation
    maxFiles,
    maxFileSizeMB = 10,
    allowDuplicates = false,

    // Queue
    value,
    defaultValue = [],
    onChange,

    // Uploaded list
    uploadedItems,
    defaultUploadedItems = [],
    onUploadedItemsChange,
    uploadedHeader = "Uploaded",

    // Behaviour
    autoUpload = true,
    clearQueueAfterUpload = true,
    uploadButtonText = "Upload",

    // TMS config
    docType,
    groupId: groupIdProp,
    onGroupIdChange,
    onGroupLoaded,
    documentAttachmentsUrl: documentAttachmentsUrlProp,
    requestHeaders,
    withCredentials = true,
    loadOnMount = true,

    // callbacks
    onReject,
    onUploadSuccess,
    onUploadError,
  } = props;

  const baseUrl =
    documentAttachmentsUrlProp ??
    (process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL || "/api-tms/document-attachments");

  /**
   * groupId internal (uncontrolled) agar komponen bisa dipakai tanpa state dari parent.
   * Kalau parent kasih groupIdProp, treat sebagai controlled.
   */
  const groupIdControlled = groupIdProp !== undefined;
  const [groupIdInternal, setGroupIdInternal] = useState<number | string | null>(groupIdProp ?? null);
  const groupId = groupIdControlled ? (groupIdProp ?? null) : groupIdInternal;

  const setGroupId = useCallback(
    (next: number | string | null, group?: TmsAttachmentGroup | null) => {
      if (!groupIdControlled) setGroupIdInternal(next);
      onGroupIdChange?.(next, group ?? null);
    },
    [groupIdControlled, onGroupIdChange]
  );

  useEffect(() => {
    if (!groupIdControlled) return;
    setGroupIdInternal(groupIdProp ?? null);
  }, [groupIdControlled, groupIdProp]);

  /** Queue state */
  const queueControlled = Array.isArray(value);
  const [queueInternal, setQueueInternal] = useState<File[]>(defaultValue);
  const queue = queueControlled ? (value as File[]) : queueInternal;

  const setQueue = useCallback(
    (next: File[]) => {
      if (queueControlled) onChange?.(next);
      else setQueueInternal(next);
    },
    [onChange, queueControlled]
  );

  /** Uploaded list state */
  const uploadedControlled = Array.isArray(uploadedItems);
  const [uploadedInternal, setUploadedInternal] = useState<UploadedFileItem[]>(defaultUploadedItems);
  const uploaded = uploadedControlled ? (uploadedItems as UploadedFileItem[]) : uploadedInternal;

  const setUploaded = useCallback(
    (next: UploadedFileItem[]) => {
      if (uploadedControlled) onUploadedItemsChange?.(next);
      else setUploadedInternal(next);
    },
    [onUploadedItemsChange, uploadedControlled]
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<TmsAttachmentGroup | null>(null);

  const maxBytes = useMemo(() => Math.max(0, maxFileSizeMB) * 1024 * 1024, [maxFileSizeMB]);

  const origin = useMemo(() => {
    try {
      const u = new URL(baseUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
      return u.origin;
    } catch {
      return "";
    }
  }, [baseUrl]);

  const resolveAttachmentUrl = useCallback(
    (raw: string) => {
      if (!raw) return raw;
      if (/^https?:\/\//i.test(raw)) return raw;
      if (!origin) return raw;
      if (raw.startsWith("/")) return `${origin}${raw}`;
      return `${origin}/${raw}`;
    },
    [origin]
  );

  const groupToUploadedItems = useCallback(
    (group: TmsAttachmentGroup): UploadedFileItem[] => {
      const gId = group.id;
      const metaGroup = { id: group.id, name: group.name, doc_type: group.doc_type };
      const items = (group.attachments ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        url: resolveAttachmentUrl(String(a.url ?? "")),
        mimetype: typeof a.mimetype === "string" ? a.mimetype : undefined,
        groupId: gId,
        meta: { ...a, group: metaGroup },
      }));
      return uniqById(items);
    },
    [resolveAttachmentUrl]
  );

  const validate = useCallback(
    (files: File[]) => {
      const messages: string[] = [];

      if (maxFiles != null && maxFiles > 0) {
        const total = (queue?.length ?? 0) + files.length;
        if (total > maxFiles) messages.push(`Maksimal ${maxFiles} file (queue sekarang: ${queue.length}).`);
      }

      const valid: File[] = [];
      const seen = new Set<string>();

      if (!allowDuplicates) {
        for (const f of queue) seen.add(fileKey(f));
      }

      for (const f of files) {
        if (!allowDuplicates) {
          const k = fileKey(f);
          if (seen.has(k)) {
            messages.push(`Duplikat: ${f.name}`);
            continue;
          }
          seen.add(k);
        }

        if (maxBytes > 0 && f.size > maxBytes) {
          messages.push(`Terlalu besar: ${f.name} (${humanSize(f.size)}), max ${maxFileSizeMB} MB.`);
          continue;
        }

        valid.push(f);
      }

      return { valid, messages };
    },
    [allowDuplicates, maxBytes, maxFileSizeMB, maxFiles, queue]
  );

  const addFilesToQueue = useCallback(
    (files: FileList | File[]) => {
      if (disabled) return;
      const list = Array.isArray(files) ? files : Array.from(files);
      const { valid, messages } = validate(list);

      if (messages.length) onReject?.(messages);
      if (!valid.length) return;

      setErr(null);
      setQueue([...(queue ?? []), ...valid]);
    },
    [disabled, onReject, queue, setQueue, validate]
  );

  const pickFiles = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const removeQueued = useCallback(
    (idx: number) => {
      if (disabled || busy) return;
      const next = [...queue];
      next.splice(idx, 1);
      setQueue(next);
    },
    [busy, disabled, queue, setQueue]
  );

  /** preview URLs for local queue image files */
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!showImagePreview) return;
    const urls: Record<string, string> = {};
    for (const f of queue) {
      if (!isImageFile(f)) continue;
      const k = fileKey(f);
      if (localPreviews[k]) urls[k] = localPreviews[k];
      else urls[k] = URL.createObjectURL(f);
    }
    for (const k of Object.keys(localPreviews)) {
      if (!urls[k]) URL.revokeObjectURL(localPreviews[k]);
    }
    setLocalPreviews(urls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, showImagePreview]);

  /**
   * ===============
   * TMS API calls
   * ===============
   */
  const fetchGroup = useCallback(
    async (id: number | string) => {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(requestHeaders ?? {}),
        },
        credentials: withCredentials ? "include" : "same-origin",
      });

      if (!res.ok) throw new Error(await readResponseError(res));
      return (await res.json()) as TmsAttachmentGroup;
    },
    [baseUrl, requestHeaders, withCredentials]
  );

  const createGroup = useCallback(
    async (files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f, f.name);

      const url = `${baseUrl}?doc_type=${encodeURIComponent(docType)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          ...(requestHeaders ?? {}),
        },
        body: fd,
        credentials: withCredentials ? "include" : "same-origin",
      });

      if (!res.ok) throw new Error(await readResponseError(res));
      return (await res.json()) as TmsAttachmentGroup;
    },
    [baseUrl, docType, requestHeaders, withCredentials]
  );

  const addFiles = useCallback(
    async (id: number | string, files: File[]) => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f, f.name);

      const res = await fetch(`${baseUrl}/${id}`, {
        method: "POST",
        headers: {
          accept: "application/json",
          ...(requestHeaders ?? {}),
        },
        body: fd,
        credentials: withCredentials ? "include" : "same-origin",
      });

      if (!res.ok) throw new Error(await readResponseError(res));
      return (await res.json()) as TmsAttachmentGroup;
    },
    [baseUrl, requestHeaders, withCredentials]
  );

  const deleteAttachment = useCallback(
    async (id: number | string, attachmentId: number | string) => {
      const res = await fetch(`${baseUrl}/${id}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
          accept: "*/*",
          ...(requestHeaders ?? {}),
        },
        credentials: withCredentials ? "include" : "same-origin",
      });

      if (!res.ok) throw new Error(await readResponseError(res));
    },
    [baseUrl, requestHeaders, withCredentials]
  );

  const refreshList = useCallback(async () => {
    if (!groupId) return;
    setLoadingList(true);
    setErr(null);
    try {
      const g = await fetchGroup(groupId);
      setGroupInfo(g);
      onGroupLoaded?.(g);
      setUploaded(groupToUploadedItems(g));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat list file.");
    } finally {
      setLoadingList(false);
    }
  }, [fetchGroup, groupId, groupToUploadedItems, onGroupLoaded, setUploaded]);

  /** Auto load list when groupId exists */
  useEffect(() => {
    if (!loadOnMount) return;
    if (!groupId) return;
    void refreshList();
  }, [groupId, loadOnMount, refreshList]);

  /**
   * ===============
   * Upload action
   * ===============
   */
  const doUpload = useCallback(async () => {
    if (disabled || busy) return;
    if (!queue.length) return;

    setBusy(true);
    setErr(null);

    try {
      const prevIds = new Set((uploaded ?? []).map((x) => String(x.id)));
      const g = groupId ? await addFiles(groupId, queue) : await createGroup(queue);

      setGroupInfo(g);
      onGroupLoaded?.(g);
      setGroupId(g.id, g);

      const allItems = groupToUploadedItems(g);
      setUploaded(allItems);

      const newItems = allItems.filter((it) => !prevIds.has(String(it.id)));
      onUploadSuccess?.(newItems, queue, g);

      if (clearQueueAfterUpload) setQueue([]);
    } catch (e) {
      onUploadError?.(e);
      setErr(e instanceof Error ? e.message : "Gagal upload file.");
    } finally {
      setBusy(false);
    }
  }, [
    addFiles,
    busy,
    clearQueueAfterUpload,
    createGroup,
    disabled,
    groupId,
    groupToUploadedItems,
    onGroupLoaded,
    onUploadError,
    onUploadSuccess,
    queue,
    setGroupId,
    setQueue,
    setUploaded,
    uploaded,
  ]);

  /** Auto-upload when queue changes */
  useEffect(() => {
    if (!autoUpload) return;
    if (!queue.length) return;
    void doUpload();
  }, [autoUpload, doUpload, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Delete uploaded attachment (server) then refresh list
   */
  const removeUploaded = useCallback(
    async (item: UploadedFileItem) => {
      if (disabled || busy) return;
      if (!groupId) {
        setErr("groupId kosong. Tidak bisa delete.");
        return;
      }

      setBusy(true);
      setErr(null);

      try {
        await deleteAttachment(groupId, item.id);
        await refreshList();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal menghapus file.");
      } finally {
        setBusy(false);
      }
    },
    [busy, deleteAttachment, disabled, groupId, refreshList]
  );

  /**
   * Drag & drop handlers
   */
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!droppable || disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const dt = e.dataTransfer;
      if (dt?.files?.length) addFilesToQueue(dt.files);
    },
    [addFilesToQueue, disabled, droppable]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!droppable || disabled) return;
      e.preventDefault();
    },
    [disabled, droppable]
  );

  const canUpload = queue.length > 0 && !disabled;
  const showRefresh = !!groupId;

  return (
    <div
      className={[
        "w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        disabled ? "opacity-60" : "",
        className ?? "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[12rem]">
          <div className="text-sm font-bold text-slate-900">{label}</div>
          <div className="mt-1 text-xs text-slate-500">{hint}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5">
              doc_type: <b>{docType}</b>
            </span>
            {groupId ? (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5">
                id: <b>{String(groupId)}</b>
              </span>
            ) : (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                id belum ada (dibuat saat upload)
              </span>
            )}
            {groupInfo?.name ? (
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5">
                {groupInfo.name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showRefresh ? (
            <button
              type="button"
              onClick={() => void refreshList()}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={disabled || busy || loadingList}
              title="Reload list dari server"
            >
              {loadingList ? "Loading..." : "Refresh"}
            </button>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) addFilesToQueue(files);
              e.currentTarget.value = "";
            }}
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

          <button
            type="button"
            onClick={() => void doUpload()}
            className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 disabled:opacity-50"
            disabled={!canUpload || busy}
            title="Upload queue sekarang"
          >
            {busy ? "Uploading..." : uploadButtonText}
          </button>
        </div>
      </div>

      {/* Error */}
      {err ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      {/* Dropzone */}
      {droppable ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className={[
            "mt-4 rounded-xl border-2 border-dashed p-4",
            disabled ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-slate-50/40 hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="text-sm font-semibold text-slate-800">Drag & drop file di sini</div>
          <div className="mt-1 text-xs text-slate-500">atau klik “Pilih File”.</div>
        </div>
      ) : null}

      {/* Queue */}
      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-slate-700">Queue</div>

        {queue.length ? (
          <ul className="space-y-2">
            {queue.map((f, idx) => {
              const k = fileKey(f);
              const preview = showImagePreview && isImageFile(f) ? localPreviews[k] : null;

              return (
                <li
                  key={`${k}__${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {preview ? (
                      <img
                        src={preview}
                        alt={f.name}
                        className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
                        FILE
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{f.name}</div>
                      <div className="text-[11px] text-slate-500">{humanSize(f.size)}</div>
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
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            {emptyPlaceholder ?? "Belum ada file di queue."}
          </div>
        )}
      </div>

      {/* Uploaded */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-700">{uploadedHeader}</div>
          {loadingList ? <div className="text-[11px] text-slate-500">Memuat...</div> : null}
        </div>

        {uploaded.length ? (
          <ul className="space-y-2">
            {uploaded.map((it) => {
              const canPreview = showImagePreview && isImageUrl(it.url);
              return (
                <li
                  key={String(it.id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {canPreview ? (
                      <img
                        src={it.url}
                        alt={it.name}
                        className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
                        UP
                      </div>
                    )}

                    <div className="min-w-0">
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-semibold text-slate-800 hover:underline"
                        title={it.name}
                      >
                        {it.name}
                      </a>
                      <div className="text-[11px] text-slate-500">
                        id: {String(it.id)}
                        {it.mimetype ? <span className="ml-2">{it.mimetype}</span> : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeUploaded(it)}
                    className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={disabled || busy || !groupId}
                    title="DELETE /{id}/attachments/{attachmentId}"
                  >
                    Hapus
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            Belum ada file uploaded.
          </div>
        )}
      </div>
    </div>
  );
}


// "use client";
// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// export type ExistingFileItem = {
//   id: number | string;
//   name: string;
//   url: string;
//   mimetype?: string;
//   groupId?: number | string;
//   meta?: Record<string, unknown>;
// };

// export type UploadedFileItem = {
//   id: number | string;
//   name: string;
//   url: string;
//   mimetype?: string;
//   size?: number;
//   groupId?: number | string;
//   meta?: Record<string, unknown>;
// };

// type StateSetter<T> = (next: T) => void;
// type SetStateLike<T> = StateSetter<T> | React.Dispatch<React.SetStateAction<T>>;

// export type IndMultiFileUploadProps = {
//   label: string;
//   hint?: string;
//   otherTerms?: string;
//   accept?: string;
//   className?: string;
//   maxFiles?: number;
//   maxFileSizeMB?: number;
//   allowDuplicates?: boolean;
//   disabled?: boolean;
//   droppable?: boolean;
//   emptyPlaceholder?: React.ReactNode;
//   showImagePreview?: boolean;
//   value?: File[];
//   defaultValue?: File[];
//   onChange?: SetStateLike<File[]>;
//   existingItems?: ExistingFileItem[];
//   existingHeader?: string;
//   onRemoveExisting?: (item: ExistingFileItem) => void | Promise<void>;
//   uploadedItems?: UploadedFileItem[];
//   defaultUploadedItems?: UploadedFileItem[];
//   onUploadedItemsChange?: SetStateLike<UploadedFileItem[]>;
//   uploadedHeader?: string;
//   uploadFiles?: (files: File[]) => Promise<UploadedFileItem[]>;
//   onRemoveUploaded?: (item: UploadedFileItem) => void | Promise<void>;
//   uploadButtonText?: string;
//   autoUpload?: boolean;
//   clearQueueAfterUpload?: boolean;
//   onReject?: (messages: string[]) => void;
//   onUploadSuccess?: (newItems: UploadedFileItem[], uploadedFiles: File[]) => void;
//   onUploadError?: (error: unknown) => void;
// };

// function humanSize(bytes: number) {
//   if (!Number.isFinite(bytes) || bytes < 0) return "";
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

// function fileKey(f: File) {
//   return `${f.name}__${f.size}__${f.lastModified}`;
// }

// function isImageFile(f: File) {
//   return f.type.startsWith("image/");
// }

// function isImageUrl(url: string) {
//   const lower = url.toLowerCase();
//   return (
//     lower.endsWith(".jpg") ||
//     lower.endsWith(".jpeg") ||
//     lower.endsWith(".png") ||
//     lower.endsWith(".gif") ||
//     lower.endsWith(".webp") ||
//     lower.includes("mimetype=image")
//   );
// }

// function uniqUploadedById(items: UploadedFileItem[]) {
//   const map = new Map<string, UploadedFileItem>();
//   for (const it of items) map.set(String(it.id), it);
//   return Array.from(map.values());
// }

// function callSetStateLike<T>(setter: SetStateLike<T> | undefined, next: T) {
//   if (!setter) return;
//   (setter as StateSetter<T>)(next);
// }

// export default function IndMultiFileUpload(props: IndMultiFileUploadProps) {
//   const {
//     label,
//     hint = "Maks. 10 MB per file.",
//     otherTerms = "",
//     accept = "",
//     className,

//     maxFiles,
//     maxFileSizeMB = 10,
//     allowDuplicates = false,
//     disabled = false,
//     droppable = true,
//     emptyPlaceholder,
//     showImagePreview = true,

//     value,
//     defaultValue = [],
//     onChange,

//     existingItems,
//     existingHeader = "Existing",
//     onRemoveExisting,

//     uploadedItems,
//     defaultUploadedItems = [],
//     onUploadedItemsChange,
//     uploadedHeader = "Uploaded",

//     uploadFiles,
//     onRemoveUploaded,
//     uploadButtonText = "Upload",
//     autoUpload = true,
//     clearQueueAfterUpload = true,

//     onReject,
//     onUploadSuccess,
//     onUploadError,
//   } = props;

//   const queueControlled = Array.isArray(value);
//   const [queueInternal, setQueueInternal] = useState<File[]>(defaultValue);
//   const queue = queueControlled ? (value as File[]) : queueInternal;

//   const setQueue = useCallback(
//     (next: File[]) => {
//       if (!queueControlled) setQueueInternal(next);
//       callSetStateLike(onChange, next);
//     },
//     [onChange, queueControlled]
//   );

//   const uploadedControlled = Array.isArray(uploadedItems);
//   const [uploadedInternal, setUploadedInternal] =
//     useState<UploadedFileItem[]>(defaultUploadedItems);
//   const uploaded = uploadedControlled
//     ? (uploadedItems as UploadedFileItem[])
//     : uploadedInternal;

//   const setUploaded = useCallback(
//     (next: UploadedFileItem[]) => {
//       if (!uploadedControlled) setUploadedInternal(next);
//       callSetStateLike(onUploadedItemsChange, next);
//     },
//     [onUploadedItemsChange, uploadedControlled]
//   );

//   // sync defaults for uncontrolled (edit prefill)
//   useEffect(() => {
//     if (!queueControlled) setQueueInternal(defaultValue);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [defaultValue]);

//   useEffect(() => {
//     if (!uploadedControlled) setUploadedInternal(defaultUploadedItems);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [defaultUploadedItems]);

//   const inputRef = useRef<HTMLInputElement | null>(null);
//   const [busy, setBusy] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const maxBytes = useMemo(
//     () => Math.max(0, maxFileSizeMB) * 1024 * 1024,
//     [maxFileSizeMB]
//   );

//   const validate = useCallback(
//     (files: File[]) => {
//       const messages: string[] = [];
//       const valid: File[] = [];

//       // count limit (queue + existing uploaded)
//       const baseCount = (uploaded?.length ?? 0) + (queue?.length ?? 0);
//       const room =
//         typeof maxFiles === "number" && maxFiles > 0
//           ? Math.max(0, maxFiles - baseCount)
//           : Infinity;

//       for (const f of files) {
//         if (maxBytes && f.size > maxBytes) {
//           messages.push(
//             `${f.name} (${humanSize(f.size)}) melebihi ${maxFileSizeMB} MB`
//           );
//           continue;
//         }
//         valid.push(f);
//       }

//       let trimmed = valid;
//       if (valid.length > room) {
//         trimmed = valid.slice(0, room);
//         for (const f of valid.slice(room)) {
//           messages.push(`${f.name} melebihi batas max files (${maxFiles})`);
//         }
//       }

//       if (!allowDuplicates) {
//         const existingKeys = new Set(queue.map(fileKey));
//         const out: File[] = [];
//         for (const f of trimmed) {
//           const k = fileKey(f);
//           if (existingKeys.has(k)) continue;
//           existingKeys.add(k);
//           out.push(f);
//         }
//         trimmed = out;
//       }

//       return { valid: trimmed, messages };
//     },
//     [allowDuplicates, maxBytes, maxFileSizeMB, maxFiles, queue, uploaded]
//   );

//   const addFilesToQueue = useCallback(
//     (files: File[]) => {
//       const { valid, messages } = validate(files);
//       if (messages.length) {
//         setErr(messages.join("\n"));
//         onReject?.(messages);
//       } else {
//         setErr(null);
//       }
//       if (!valid.length) return;
//       setQueue([...queue, ...valid]);
//     },
//     [onReject, queue, setQueue, validate]
//   );

//   const pickFiles = useCallback(() => {
//     if (disabled) return;
//     inputRef.current?.click();
//   }, [disabled]);

//   const onInputChange = useCallback(
//     (e: React.ChangeEvent<HTMLInputElement>) => {
//       const files = e.target.files ? Array.from(e.target.files) : [];
//       if (files.length) addFilesToQueue(files);
//       e.target.value = "";
//     },
//     [addFilesToQueue]
//   );

//   const removeQueued = useCallback(
//     (idx: number) => {
//       const next = queue.filter((_, i) => i !== idx);
//       setQueue(next);
//     },
//     [queue, setQueue]
//   );

//   const doUpload = useCallback(async () => {
//     if (!uploadFiles) return;
//     if (!queue.length || busy || disabled) return;

//     setBusy(true);
//     setErr(null);

//     try {
//       const newItems = await uploadFiles(queue);
//       const merged = uniqUploadedById([...(uploaded ?? []), ...(newItems ?? [])]);
//       setUploaded(merged);
//       onUploadSuccess?.(newItems ?? [], queue);

//       if (clearQueueAfterUpload) setQueue([]);
//     } catch (e) {
//       setErr(e instanceof Error ? e.message : "Gagal upload file.");
//       onUploadError?.(e);
//     } finally {
//       setBusy(false);
//     }
//   }, [
//     uploadFiles,
//     queue,
//     busy,
//     disabled,
//     uploaded,
//     setUploaded,
//     onUploadSuccess,
//     clearQueueAfterUpload,
//     setQueue,
//     onUploadError,
//   ]);

//   useEffect(() => {
//     if (!uploadFiles) return;
//     if (!autoUpload) return;
//     if (!queue.length) return;
//     void doUpload();
//   }, [autoUpload, doUpload, queue, uploadFiles]);

//   const removeUploaded = useCallback(
//     async (item: UploadedFileItem) => {
//       if (busy || disabled) return;

//       setErr(null);
//       try {
//         if (onRemoveUploaded) await onRemoveUploaded(item);
//         const next = (uploaded ?? []).filter((x) => String(x.id) !== String(item.id));
//         setUploaded(next);
//       } catch (e) {
//         setErr(e instanceof Error ? e.message : "Gagal menghapus file.");
//       }
//     },
//     [busy, disabled, onRemoveUploaded, setUploaded, uploaded]
//   );

//   // preview for local image files
//   const [previews, setPreviews] = useState<Record<string, string>>({});
//   useEffect(() => {
//     if (!showImagePreview) return;

//     const next: Record<string, string> = {};
//     for (const f of queue) {
//       if (!isImageFile(f)) continue;
//       const k = fileKey(f);
//       next[k] = previews[k] ?? URL.createObjectURL(f);
//     }

//     // revoke removed
//     for (const k of Object.keys(previews)) {
//       if (!next[k]) URL.revokeObjectURL(previews[k]);
//     }

//     setPreviews(next);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [queue, showImagePreview]);

//   useEffect(() => {
//     return () => {
//       for (const k of Object.keys(previews)) URL.revokeObjectURL(previews[k]);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Drag & Drop
//   const [dragOver, setDragOver] = useState(false);
//   const onDragOver = useCallback(
//     (e: React.DragEvent) => {
//       if (!droppable || disabled) return;
//       e.preventDefault();
//       setDragOver(true);
//     },
//     [droppable, disabled]
//   );
//   const onDragLeave = useCallback(() => setDragOver(false), []);
//   const onDrop = useCallback(
//     (e: React.DragEvent) => {
//       if (!droppable || disabled) return;
//       e.preventDefault();
//       setDragOver(false);
//       const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
//       if (files.length) addFilesToQueue(files);
//     },
//     [droppable, disabled, addFilesToQueue]
//   );

//   // Always show manual upload button when there are queued files as a fallback
//   // (useful when autoUpload is enabled but network / CORS blocks the request).
//   const canUpload = !!uploadFiles && queue.length > 0;

//   return (
//     <div
//       className={[
//         "w-full rounded-xl border bg-white/70 p-3",
//         droppable
//           ? dragOver
//             ? "border-primary-400 ring-2 ring-primary-200"
//             : "border-slate-200"
//           : "border-slate-200",
//         className ?? "",
//       ].join(" ")}
//       onDragOver={onDragOver}
//       onDragLeave={onDragLeave}
//       onDrop={onDrop}
//     >
//       <div className="mb-2 flex items-start justify-between gap-2">
//         <div className="min-w-0">
//           <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
//             {label}
//           </div>
//           <div className="text-xs text-slate-500">
//             {hint} {otherTerms ? <span className="ml-1">{otherTerms}</span> : null}
//           </div>
//         </div>

//         <div className="flex shrink-0 items-center gap-2">
//           <input
//             ref={inputRef}
//             type="file"
//             multiple
//             accept={accept}
//             onChange={onInputChange}
//             className="hidden"
//             disabled={disabled}
//           />

//           <button
//             type="button"
//             onClick={pickFiles}
//             className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
//             disabled={disabled || busy}
//           >
//             + Pilih File
//           </button>

//           {/* {canUpload ? ( */}
//             <button
//               type="button"
//               onClick={() => void doUpload()}
//               className="inline-flex items-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm hover:bg-primary-100 disabled:opacity-50"
//               disabled={disabled || busy}
//             >
//               {busy ? "Uploading..." : uploadButtonText}
//             </button>
//           {/* ) : null} */}
//         </div>
//       </div>

//       {droppable ? (
//         <div className="mb-2 text-xs text-slate-500">
//           Drag &amp; drop file ke area ini (opsional)
//         </div>
//       ) : null}

//       {err ? (
//         <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
//           {err}
//         </pre>
//       ) : null}

//       {/* Queue */}
//       {queue.length ? (
//         <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2">
//           <div className="mb-2 text-xs font-semibold text-slate-700">Queue</div>
//           <ul className="space-y-2">
//             {queue.map((f, idx) => {
//               const k = fileKey(f);
//               const pv = previews[k];
//               const showPv = showImagePreview && !!pv;

//               return (
//                 <li
//                   key={k}
//                   className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2"
//                 >
//                   {showPv ? (
//                     <img
//                       src={pv}
//                       alt={f.name}
//                       className="h-12 w-12 rounded-md object-cover"
//                     />
//                   ) : (
//                     <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
//                       {f.name.split(".").pop()?.slice(0, 4)?.toUpperCase() ?? "FILE"}
//                     </div>
//                   )}

//                   <div className="min-w-0 flex-1">
//                     <div className="truncate text-sm font-semibold text-slate-800">
//                       {f.name}
//                     </div>
//                     <div className="text-[11px] text-slate-500">
//                       {humanSize(f.size)}
//                     </div>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => removeQueued(idx)}
//                     className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
//                     disabled={disabled || busy}
//                   >
//                     Hapus
//                   </button>
//                 </li>
//               );
//             })}
//           </ul>
//         </div>
//       ) : null}

//       {/* Existing (server) */}
//       {existingItems?.length ? (
//         <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2">
//           <div className="mb-2 text-xs font-semibold text-slate-700">
//             {existingHeader}
//           </div>
//           <ul className="space-y-2">
//             {existingItems.map((it) => (
//               <li
//                 key={String(it.id)}
//                 className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
//               >
//                 <div className="min-w-0 flex-1">
//                   <a
//                     href={it.url}
//                     target="_blank"
//                     rel="noreferrer"
//                     className="block truncate text-sm font-semibold text-primary-700 hover:underline"
//                   >
//                     {it.name}
//                   </a>
//                 </div>

//                 {onRemoveExisting ? (
//                   <button
//                     type="button"
//                     onClick={() => void onRemoveExisting(it)}
//                     className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
//                     disabled={disabled || busy}
//                   >
//                     Hapus
//                   </button>
//                 ) : null}
//               </li>
//             ))}
//           </ul>
//         </div>
//       ) : null}

//       {/* Uploaded results */}
//       <div className="mt-3">
//         {uploaded?.length ? (
//           <div className="rounded-lg border border-slate-200 bg-white/60 p-2">
//             <div className="mb-2 text-xs font-semibold text-slate-700">
//               {uploadedHeader}
//             </div>
//             <ul className="space-y-2">
//               {uploaded.map((it) => (
//                 <li
//                   key={String(it.id)}
//                   className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
//                 >
//                   <div className="min-w-0 flex-1">
//                     <a
//                       href={it.url}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="block truncate text-sm font-semibold text-primary-700 hover:underline"
//                     >
//                       {it.name}
//                     </a>
//                     {showImagePreview && isImageUrl(it.url) ? (
//                       <img
//                         src={it.url}
//                         alt={it.name}
//                         className="mt-2 max-h-44 w-full rounded-lg object-contain"
//                       />
//                     ) : null}
//                   </div>

//                   {onRemoveUploaded ? (
//                     <button
//                       type="button"
//                       onClick={() => void removeUploaded(it)}
//                       className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
//                       disabled={disabled || busy}
//                     >
//                       Hapus
//                     </button>
//                   ) : null}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         ) : (
//           <div className="rounded-lg border border-dashed border-slate-200 bg-white/40 p-3 text-sm text-slate-500">
//             {emptyPlaceholder ?? "Belum ada file."}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }