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
   * (Optional) Jika upload pertama membuat group baru (groupId awal null),
   * komponen bisa otomatis PATCH ke endpoint route doc-attachment:
   *   PATCH /api-tms/purchase-orders/{orderId}/routes/{routeId}/doc-attachment
   * untuk mengikat groupId yang baru dibuat.
   */
  orderId?: number | string;
  routeId?: number | string;

  /**
   * Current route doc-attachment IDs (optional).
   * Used to avoid overwriting the other side when PATCH-ing /doc-attachment.
   */
  routePickupAttachmentId?: number | string | null;
  routeDropOffAttachmentId?: number | string | null;

  /**
   * Base URL purchase-orders.
   * - Jika diisi: mis. "https://.../api-tms/purchase-orders" atau "/api-tms/purchase-orders"
   * - Jika kosong: akan di-derive dari documentAttachmentsUrl.
   */
  purchaseOrdersUrl?: string;

  /** Dipanggil setelah PATCH sukses (hanya pada create pertama). */
  onRouteDocAttachmentPatched?: (args: {
    orderId: number | string;
    routeId: number | string;
    docType: string;
    groupId: number | string;
  }) => void;

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

function derivePurchaseOrdersUrl(documentAttachmentsUrl: string) {
  // Prefer: trim trailing "/document-attachments"
  const trimmed = documentAttachmentsUrl.replace(/\/+$/, "");
  const bySuffix = trimmed.replace(/\/document-attachments$/i, "");
  if (bySuffix !== trimmed) return `${bySuffix}/purchase-orders`;

  // If contains "/api-tms" somewhere, keep up to that
  const m = trimmed.match(/^(.*\/api-tms)(?:\/|$)/i);
  if (m?.[1]) return `${m[1]}/purchase-orders`;

  // Fallback relative
  return `/api-tms/purchase-orders`;
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
    routePickupAttachmentId,
    routeDropOffAttachmentId,
    purchaseOrdersUrl: purchaseOrdersUrlProp,
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
    onRouteDocAttachmentPatched,
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

  // Jika upload terjadi saat orderId/routeId belum siap (mis. initial load),
  // kita simpan groupId supaya bisa di-PATCH otomatis begitu routeId tersedia.
  const pendingRoutePatchRef = useRef<number | string | null>(null);
  const patchInFlightRef = useRef(false);

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

  /**
   * Jika group baru dibuat saat upload pertama (groupId awal null),
   * maka bind ke route lewat endpoint:
   *   PATCH /api-tms/purchase-orders/{orderId}/routes/{routeId}/doc-attachment
   */
  const patchRouteDocAttachment = useCallback(
    async (newGroupId: number | string) => {
      // only for these docTypes
      const gid: number | string =
        typeof newGroupId === "number"
          ? newGroupId
          : /^\d+$/.test(String(newGroupId))
            ? Number(newGroupId)
            : newGroupId;

      const oId = orderId;
      const rId = routeId;

      const hasOrder = oId !== undefined && oId !== null && String(oId).trim() !== "";
      const hasRoute = rId !== undefined && rId !== null && String(rId).trim() !== "";

      // Jika order/route belum siap, simpan agar bisa dipatch otomatis nanti.
      if (!hasOrder || !hasRoute) {
        pendingRoutePatchRef.current = gid;
        return;
      }

      const normId = (v: unknown): number | string | null => {
        if (v === undefined || v === null) return null;
        if (typeof v === "number") return Number.isFinite(v) ? v : null;
        if (typeof v === "string") {
          const s = v.trim();
          if (!s) return null;
          if (/^\d+$/.test(s)) return Number(s);
          return s;
        }
        return null;
      };

      let payload: Record<string, number | string> | null = null;
      if (docType === "route_purchase_pickup") {
        const other = normId(routeDropOffAttachmentId);
        payload =
          other !== null
            ? { pickup_attachment_id: gid, drop_off_attachment_id: other }
            : { pickup_attachment_id: gid };
      } else if (docType === "route_purchase_drop_off") {
        const other = normId(routePickupAttachmentId);
        payload =
          other !== null
            ? { pickup_attachment_id: other, drop_off_attachment_id: gid }
            : { drop_off_attachment_id: gid };
      } else {
        return;
      }

      const poBase = (purchaseOrdersUrlProp ?? derivePurchaseOrdersUrl(baseUrl)).replace(/\/+$/, "");
      const url = `${poBase}/${encodeURIComponent(String(oId))}/routes/${encodeURIComponent(
        String(rId)
      )}/doc-attachment`;

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
      onRouteDocAttachmentPatched?.({ orderId: oId, routeId: rId, docType, groupId: gid });
    },
    [
      baseUrl,
      docType,
      onRouteDocAttachmentPatched,
      orderId,
      purchaseOrdersUrlProp,
      requestHeaders,
      routeId,
      routePickupAttachmentId,
      routeDropOffAttachmentId,
      withCredentials,
    ]
  );

  // Jika sebelumnya tertunda karena orderId/routeId belum siap,
  // jalankan PATCH otomatis ketika sudah tersedia.
  useEffect(() => {
    const pending = pendingRoutePatchRef.current;
    if (pending === null || pending === undefined) return;

    const oId = orderId;
    const rId = routeId;
    const hasOrder = oId !== undefined && oId !== null && String(oId).trim() !== "";
    const hasRoute = rId !== undefined && rId !== null && String(rId).trim() !== "";
    if (!hasOrder || !hasRoute) return;

    if (patchInFlightRef.current) return;
    patchInFlightRef.current = true;

    void patchRouteDocAttachment(pending)
      .then(() => {
        pendingRoutePatchRef.current = null;
      })
      .catch((e) => {
        pendingRoutePatchRef.current = null;
        setErr(
          e instanceof Error
            ? `Upload berhasil, tapi gagal mengikat attachment ke route. ${e.message}`
            : "Upload berhasil, tapi gagal mengikat attachment ke route."
        );
      })
      .finally(() => {
        patchInFlightRef.current = false;
      });
  }, [orderId, routeId, patchRouteDocAttachment]);

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

  /** Auto load list when groupId exists (guarded to avoid loop) */
  const lastLoadedGroupIdRef = useRef<string>("");
  useEffect(() => {
    if (!loadOnMount) return;
    if (!groupId) return;

    const gid = String(groupId);
    if (lastLoadedGroupIdRef.current === gid) return;
    lastLoadedGroupIdRef.current = gid;

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
      const creatingNewGroup = groupId === null || groupId === undefined;
      const g = groupId !== null && groupId !== undefined ? await addFiles(groupId, queue) : await createGroup(queue);

      let patchWarn: string | null = null;
      if (creatingNewGroup) {
        try {
          await patchRouteDocAttachment(g.id);
        } catch (e) {
          patchWarn = e instanceof Error ? e.message : "Gagal PATCH route doc-attachment.";
        }
      }

      setGroupInfo(g);
      onGroupLoaded?.(g);
      setGroupId(g.id, g);

      const allItems = groupToUploadedItems(g);
      setUploaded(allItems);

      const newItems = allItems.filter((it) => !prevIds.has(String(it.id)));
      onUploadSuccess?.(newItems, queue, g);

      if (clearQueueAfterUpload) setQueue([]);

      if (patchWarn) {
        setErr(
          `Upload berhasil, tapi gagal mengikat attachment ke route. ${patchWarn}`
        );
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

  // Keep latest doUpload in a ref so auto-upload effect doesn't loop due to doUpload identity changes.
  const doUploadRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    doUploadRef.current = doUpload;
  }, [doUpload]);

  /** Auto-upload (only once per queue signature; no auto-retry loop) */
  const autoSigRef = useRef<string>("");
  const queueSig = useMemo(() => queue.map(fileKey).join("|"), [queue]);

  useEffect(() => {
    if (!autoUpload) return;

    // reset signature when queue emptied
    if (!queue.length) {
      autoSigRef.current = "";
      return;
    }

    // avoid re-trigger while busy or for the same queue content
    if (busy) return;

    const sig = `${String(groupId ?? "null")}::${queueSig}`;
    if (autoSigRef.current === sig) return;
    autoSigRef.current = sig;

    void doUploadRef.current();
  }, [autoUpload, busy, groupId, queue.length, queueSig]);

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
