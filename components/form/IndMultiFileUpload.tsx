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
 *
 * Tambahan (FIX):
 * - Saat create group baru (groupId awal null), komponen akan PATCH ke:
 *   PATCH /api-tms/purchase-orders/{orderId}/routes/{routeId}/doc-attachment
 *   untuk mengikat groupId ke pickup_attachment_id / drop_off_attachment_id.
 * - Kalau orderId/routeId belum siap saat upload pertama (mis. currentRouteId masih undefined pada render awal),
 *   binding akan di-defer dan diulang otomatis saat orderId/routeId sudah tersedia.
 * - Refresh list punya abort + timeout, supaya UI tidak stuck "Loading..." jika request GET pending.
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
  url: string;
  mimetype?: string;
  groupId: number | string;
  meta?: Record<string, unknown>;
};

type SetStateLike<T> = (v: React.SetStateAction<T>) => void;

type RouteDocPayload = Partial<{
  pickup_attachment_id: number | string;
  drop_off_attachment_id: number | string;
}>;

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

  /** Queue (optional controlled) */
  value?: File[];
  defaultValue?: File[];
  onChange?: SetStateLike<File[]>;

  /** Uploaded items (optional controlled) */
  uploadedItems?: UploadedFileItem[];
  defaultUploadedItems?: UploadedFileItem[];
  onUploadedItemsChange?: SetStateLike<UploadedFileItem[]>;
  uploadedHeader?: string;

  /** Behaviour */
  autoUpload?: boolean;
  clearQueueAfterUpload?: boolean;
  uploadButtonText?: string;

  /** doc_type wajib */
  docType: string;

  /** Binding (route doc-attachment) */
  orderId?: number | string;
  routeId?: number | string;
  purchaseOrdersUrl?: string;
  routePickupAttachmentId?: number | string | null;
  routeDropOffAttachmentId?: number | string | null;
  onRouteDocAttachmentPatched?: (args: {
    orderId: number | string;
    routeId: number | string;
    docType: string;
    groupId: number | string;
  }) => void;

  /** group id (document-attachments/{id}) */
  groupId?: number | string | null;
  onGroupIdChange?: (nextId: number | string | null, group?: TmsAttachmentGroup | null) => void;
  onGroupLoaded?: (group: TmsAttachmentGroup) => void;

  /** Base URL document-attachments */
  documentAttachmentsUrl?: string;

  /** Extra headers (mis Authorization). Jangan isi Content-Type untuk multipart */
  requestHeaders?: Record<string, string>;

  /** credentials */
  withCredentials?: boolean;

  /** Auto load list ketika groupId tersedia */
  loadOnMount?: boolean;

  /** Network */
  listTimeoutMs?: number;

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

function derivePurchaseOrdersUrl(documentAttachmentsUrl: string) {
  const trimmed = documentAttachmentsUrl.replace(/\/+$/, "");
  const bySuffix = trimmed.replace(/\/document-attachments$/i, "");
  if (bySuffix !== trimmed) return `${bySuffix}/purchase-orders`;

  const m = trimmed.match(/^(.*\/api-tms)(?:\/|$)/i);
  if (m?.[1]) return `${m[1]}/purchase-orders`;

  return `/api-tms/purchase-orders`;
}

function normNumOrStr(v: number | string): number | string {
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s);
  return s;
}

function normOptionalId(v: unknown): number | string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  return s;
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
    orderId,
    routeId,
    purchaseOrdersUrl: purchaseOrdersUrlProp,
    routePickupAttachmentId,
    routeDropOffAttachmentId,

    groupId: groupIdProp,
    onGroupIdChange,
    onGroupLoaded,

    documentAttachmentsUrl: documentAttachmentsUrlProp,
    requestHeaders,
    withCredentials = true,
    loadOnMount = true,
    listTimeoutMs = 15000,

    // callbacks
    onReject,
    onUploadSuccess,
    onUploadError,
    onRouteDocAttachmentPatched,
  } = props;

  const baseUrl =
    documentAttachmentsUrlProp ??
    (process.env.NEXT_PUBLIC_TMS_DOCUMENT_ATTACHMENTS_URL || "/api-tms/document-attachments");

  /** groupId internal (uncontrolled) */
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

  /**
   * ======================
   * PATCH route doc-attachment
   * ======================
   */
  const buildRoutePayload = useCallback(
    (newGroupId: number | string): RouteDocPayload | null => {
      const gid = normNumOrStr(newGroupId);

      if (docType === "route_purchase_pickup") {
        const other = normOptionalId(routeDropOffAttachmentId);
        return other !== null ? { pickup_attachment_id: gid, drop_off_attachment_id: other } : { pickup_attachment_id: gid };
      }
      if (docType === "route_purchase_drop_off") {
        const other = normOptionalId(routePickupAttachmentId);
        return other !== null ? { pickup_attachment_id: other, drop_off_attachment_id: gid } : { drop_off_attachment_id: gid };
      }
      return null;
    },
    [docType, routeDropOffAttachmentId, routePickupAttachmentId]
  );

  const patchRouteDocAttachment = useCallback(
    async (newGroupId: number | string) => {
      const oId = orderId;
      const rId = routeId;
      if (oId === undefined || oId === null) return { ok: false, skipped: true } as const;
      if (rId === undefined || rId === null) return { ok: false, skipped: true } as const;

      const payload = buildRoutePayload(newGroupId);
      if (!payload) return { ok: false, skipped: true } as const;

      const poBase = (purchaseOrdersUrlProp ?? derivePurchaseOrdersUrl(baseUrl)).replace(/\/+$/, "");
      const url = `${poBase}/${encodeURIComponent(String(oId))}/routes/${encodeURIComponent(String(rId))}/doc-attachment`;

      console.log("Patching route doc-attachment:", url, payload);

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          ...(requestHeaders ?? {}),
        },
        body: JSON.stringify(payload),
        credentials: withCredentials ? "include" : "same-origin",
      });

      if (!res.ok) throw new Error(await readResponseError(res));
      onRouteDocAttachmentPatched?.({ orderId: oId, routeId: rId, docType, groupId: normNumOrStr(newGroupId) });
      return { ok: true, skipped: false } as const;
    },
    [
      baseUrl,
      buildRoutePayload,
      docType,
      onRouteDocAttachmentPatched,
      orderId,
      purchaseOrdersUrlProp,
      requestHeaders,
      routeId,
      withCredentials,
    ]
  );

  /** Pending bind jika upload terjadi sebelum orderId/routeId ready */
  const pendingBindRef = useRef<number | string | null>(null);
  const bindingRef = useRef(false);
  // Guard agar tidak PATCH berulang untuk kombinasi yang sama
  const lastBoundKeyRef = useRef<string>("");

  useEffect(() => {
    const pending = pendingBindRef.current;
    if (pending === null || pending === undefined) return;
    if (bindingRef.current) return;
    if (orderId === undefined || orderId === null) return;
    if (routeId === undefined || routeId === null) return;

    bindingRef.current = true;
    (async () => {
      try {
        const r = await patchRouteDocAttachment(pending);
        if (r.ok) {
          const key = `${docType}:${String(orderId)}:${String(routeId)}:${String(pending)}`;
          lastBoundKeyRef.current = key;
          pendingBindRef.current = null;
        }
      } catch (e) {
        // Jangan bikin UI stuck; cukup tampilkan error sekali.
        setErr(e instanceof Error ? e.message : "Gagal mengikat attachment ke route.");
      } finally {
        bindingRef.current = false;
      }
    })();
  }, [docType, orderId, routeId, patchRouteDocAttachment]);

  // Safety-net: kalau groupId sudah ada (misalnya upload sukses / state parent sudah update),
  // tapi field pickup_attachment_id / drop_off_attachment_id di route masih kosong,
  // lakukan bind otomatis sekali (tanpa harus menunggu "creatingNewGroup").
  useEffect(() => {
    if (groupId === null || groupId === undefined) return;
    if (orderId === undefined || orderId === null) return;
    if (routeId === undefined || routeId === null) return;

    const gid = groupId;
    const boundKey = `${docType}:${String(orderId)}:${String(routeId)}:${String(gid)}`;
    if (lastBoundKeyRef.current === boundKey) return;
    if (bindingRef.current) return;

    // Kalau props route sudah punya id yang sama, tidak perlu patch.
    const gidNorm = normOptionalId(gid);
    if (docType === "route_purchase_pickup") {
      const cur = normOptionalId(routePickupAttachmentId);
      if (cur !== null && gidNorm !== null && String(cur) === String(gidNorm)) {
        lastBoundKeyRef.current = boundKey;
        return;
      }
      // Kalau route sudah punya pickup id (walau beda), jangan override diam-diam.
      if (cur !== null) return;
    }
    if (docType === "route_purchase_drop_off") {
      const cur = normOptionalId(routeDropOffAttachmentId);
      if (cur !== null && gidNorm !== null && String(cur) === String(gidNorm)) {
        lastBoundKeyRef.current = boundKey;
        return;
      }
      if (cur !== null) return;
    }

    bindingRef.current = true;
    (async () => {
      try {
        const r = await patchRouteDocAttachment(gid);
        if (r.ok) lastBoundKeyRef.current = boundKey;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal mengikat attachment ke route.");
      } finally {
        bindingRef.current = false;
      }
    })();
  }, [docType, groupId, orderId, routeDropOffAttachmentId, routeId, routePickupAttachmentId, patchRouteDocAttachment]);

  /**
   * ==================
   * LIST/REFRESH (abort + timeout)
   * ==================
   */
  const refreshAbortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async () => {
    if (!groupId) return;

    // abort request sebelumnya
    refreshAbortRef.current?.abort();
    const ac = new AbortController();
    refreshAbortRef.current = ac;
    const timer = setTimeout(() => ac.abort(), Math.max(1000, listTimeoutMs));

    setLoadingList(true);
    setErr(null);

    try {
      const res = await fetch(`${baseUrl}/${groupId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(requestHeaders ?? {}),
        },
        credentials: withCredentials ? "include" : "same-origin",
        signal: ac.signal,
      });

      if (!res.ok) throw new Error(await readResponseError(res));
      const g = (await res.json()) as TmsAttachmentGroup;
      setGroupInfo(g);
      onGroupLoaded?.(g);
      setUploaded(groupToUploadedItems(g));
    } catch (e) {
      // AbortError jangan dianggap error
      const anyErr = e as { name?: string };
      if (anyErr?.name === "AbortError") {
        setErr("Request list file timeout / dibatalkan.");
      } else {
        setErr(e instanceof Error ? e.message : "Gagal memuat list file.");
      }
    } finally {
      clearTimeout(timer);
      if (refreshAbortRef.current === ac) refreshAbortRef.current = null;
      setLoadingList(false);
    }
  }, [baseUrl, groupId, groupToUploadedItems, listTimeoutMs, onGroupLoaded, requestHeaders, setUploaded, withCredentials]);

  useEffect(() => {
    if (!loadOnMount) return;
    if (!groupId) return;
    void refreshList();
  }, [groupId, loadOnMount, refreshList]);

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
      refreshAbortRef.current = null;
    };
  }, []);

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
      const creatingNewGroup = groupId === null || groupId === undefined;

      const g = groupId !== null && groupId !== undefined ? await addFiles(groupId, queue) : await createGroup(queue);

      // Update state/UI segera
      setGroupInfo(g);
      onGroupLoaded?.(g);
      setGroupId(g.id, g);

      const allItems = groupToUploadedItems(g);
      setUploaded(allItems);

      const newItems = allItems.filter((it) => !prevIds.has(String(it.id)));
      onUploadSuccess?.(newItems, queue, g);

      if (clearQueueAfterUpload) setQueue([]);

      // Bind ke route hanya ketika create pertama
      if (creatingNewGroup) {
        pendingBindRef.current = g.id;
        try {
          const r = await patchRouteDocAttachment(g.id);
          if (r.ok) pendingBindRef.current = null;
          // kalau skipped (orderId/routeId belum siap) -> akan di-bind oleh useEffect
        } catch (e) {
          pendingBindRef.current = null;
          setErr(
            `Upload berhasil, tapi gagal mengikat attachment ke route. ${
              e instanceof Error ? e.message : ""
            }`.trim()
          );
        }
      }
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
    patchRouteDocAttachment,
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

  /** Drag & drop handlers */
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
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5">{groupInfo.name}</span>
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

      {/* Dropzone */}
      {droppable ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center"
        >
          <div className="text-lg font-semibold text-slate-700">Drag & drop file di sini</div>
          <div className="mt-1 text-sm text-slate-500">atau klik “Pilih File”.</div>
        </div>
      ) : null}

      {/* Errors */}
      {err ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
      ) : null}

      {/* Queue */}
      <div className="mt-5">
        <div className="text-sm font-semibold text-slate-700">Queue</div>
        {queue.length ? (
          <div className="mt-2 space-y-2">
            {queue.map((f, idx) => {
              const k = fileKey(f);
              const img = showImagePreview && (isImageFile(f) || isImageUrl(f.name));
              return (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {img ? (
                      <img
                        src={localPreviews[k]}
                        alt={f.name}
                        className="h-10 w-10 flex-none rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                        Q
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{f.name}</div>
                      <div className="text-xs text-slate-500">{humanSize(f.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={disabled || busy}
                    onClick={() => removeQueued(idx)}
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
            Belum ada file di queue.
          </div>
        )}
      </div>

      {/* Uploaded */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-slate-700">{uploadedHeader}</div>

        {uploaded.length ? (
          <div className="mt-2 space-y-2">
            {uploaded.map((it) => {
              const img = showImagePreview && isImageUrl(it.url);
              return (
                <div key={String(it.id)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {img ? (
                      <img
                        src={it.url}
                        alt={it.name}
                        className="h-10 w-10 flex-none rounded-md border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                        UP
                      </div>
                    )}

                    <div className="min-w-0">
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-semibold text-slate-800 hover:underline"
                      >
                        {it.name}
                      </a>
                      <div className="text-xs text-slate-500">
                        id: {String(it.id)}
                        {it.mimetype ? <span className="ml-2">{it.mimetype}</span> : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    disabled={disabled || busy}
                    onClick={() => void removeUploaded(it)}
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
            {emptyPlaceholder ?? "Belum ada file uploaded."}
          </div>
        )}
      </div>
    </div>
  );
}
