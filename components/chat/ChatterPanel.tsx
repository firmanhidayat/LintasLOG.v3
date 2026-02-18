"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import { goSignIn } from "@/lib/goSignIn";
import { Button } from "@/components/ui/Button";
import { FieldTextarea } from "@/components/form/FieldTextarea";

type IdLike = string | number;

export type ChatterMessage = {
  id: IdLike;
  body: string;
  authorName?: string;
  date?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toIdLike(v: unknown): IdLike | null {
  return typeof v === "string" || typeof v === "number" ? v : null;
}

function toStringSafe(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function stripHtml(html: string): string {
  // Minimal strip to avoid XSS without extra deps (DOMPurify, etc.)
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMessages(payload: unknown): ChatterMessage[] {
  // Supported shapes (best-effort):
  // - array
  // - { items: [] } / { data: [] } / { results: [] } / { messages: [] }
  const arr: unknown[] = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
    ? (payload.items as unknown[])
    : isRecord(payload) && Array.isArray(payload.data)
    ? (payload.data as unknown[])
    : isRecord(payload) && Array.isArray(payload.results)
    ? (payload.results as unknown[])
    : isRecord(payload) && Array.isArray(payload.messages)
    ? (payload.messages as unknown[])
    : [];

  const mapped = arr
    .map((raw): ChatterMessage | null => {
      if (!isRecord(raw)) return null;

      const id = toIdLike(raw.id ?? raw.message_id ?? raw.uuid);
      if (id == null) return null;

      const bodyRaw =
        raw.body ?? raw.note ?? raw.message ?? raw.summary ?? raw.text ?? "";

      const body = stripHtml(toStringSafe(bodyRaw));

      const authorRaw =
        (isRecord(raw.author) &&
          (raw.author.name ?? raw.author.display_name)) ||
        (isRecord(raw.user) && raw.user.name) ||
        raw.author_name ||
        raw.user_name ||
        raw.from ||
        "";

      const authorName = stripHtml(toStringSafe(authorRaw)) || undefined;

      const date =
        toStringSafe(
          raw.date ?? raw.create_date ?? raw.datetime ?? raw.timestamp
        ) || undefined;

      return { id, body, authorName, date };
    })
    .filter((x): x is ChatterMessage => Boolean(x));

  // Sort by date if possible, else keep backend order
  const withTs = mapped.map((m) => {
    const ts = m.date ? Date.parse(m.date.replace(" ", "T")) : NaN;
    return { ...m, _ts: ts };
  });

  const sortable = withTs.every((m) => Number.isFinite(m._ts));
  const sorted = sortable
    ? [...withTs].sort((a, b) => (a._ts as number) - (b._ts as number))
    : withTs;

  return sorted.map(({ _ts, ...m }) => m);
}

function normalizeEndpointBase(endpointBase: string): string {
  const e = endpointBase.trim();
  if (!e) return "";
  // Allow absolute URL or relative path. If relative path without leading slash, normalize to leading slash.
  if (e.startsWith("http://") || e.startsWith("https://")) return e;
  return e.startsWith("/") ? e : `/${e}`;
}

export function ChatterPanel({
  resModel,
  resId,
  endpointBase = "",
  title,
  className,
  enabled = true,
  currentAuthorName,
  onRead,
}: {
  resModel?: string | null;
  resId?: IdLike | null;
  endpointBase?: string;
  title?: string;
  className?: string;
  enabled?: boolean;
  currentAuthorName?: string;
  onRead?: () => void;
}) {
  const router = useRouter();

  const base = useMemo(
    () => normalizeEndpointBase(endpointBase),
    [endpointBase]
  );

  const canUse =
    enabled && Boolean(resModel) && resId != null && String(resId) !== "";

  const url = useMemo(() => {
    if (!canUse) return "";
    const qs = new URLSearchParams({
      res_model: String(resModel ?? ""),
      res_id: String(resId ?? ""),
    });
    return `${base}?${qs.toString()}`;
  }, [base, canUse, resModel, resId]);

  const [items, setItems] = useState<ChatterMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async () => {
    if (!canUse || !url) return;
    try {
      setLoading(true);
      setErr(null);

      const res = await fetch(url, {
        headers: { "Accept-Language": getLang() },
        credentials: "include",
      });

      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load chat (${res.status})`);
      }

      const json = (await res.json()) as unknown;
      const parsed = parseMessages(json);
      setItems(parsed);

      // Consider "read" after successful load
      onRead?.();

      // Auto-scroll on load
      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [canUse, url, router.replace, onRead, scrollToBottom]);

  const send = useCallback(async () => {
    if (!canUse || !url) return;
    const msg = draft.trim();
    if (!msg) return;

    try {
      setSending(true);
      setErr(null);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": getLang(),
        },
        credentials: "include",
        body: JSON.stringify({ body: msg }),
      });

      if (res.status === 401) {
        goSignIn({ routerReplace: router.replace });
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to send message (${res.status})`);
      }

      setDraft("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [canUse, url, draft, router.replace, load]);

  useEffect(() => {
    load();
  }, [load]);

  // Optional: light auto-refresh every 20s when enabled and usable
  // useEffect(() => {
  //   if (!canUse) return;
  //   const id = window.setInterval(() => load(), 20000);
  //   return () => window.clearInterval(id);
  // }, [canUse, load]);

  const isMine = (author?: string) => {
    if (!author || !currentAuthorName) return false;
    return (
      author.trim().toLowerCase() === currentAuthorName.trim().toLowerCase()
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-800">
          {title ?? t("orders.chat") ?? "Chat"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={load}
            disabled={!canUse || loading}
            title={t("common.refresh") ?? "Refresh"}
          >
            {loading
              ? t("common.loading") ?? "Loading"
              : t("common.refresh") ?? "Refresh"}
          </Button>
        </div>
      </div>

      {!canUse ? (
        <div className="mt-2 text-xs text-gray-500">
          {t("orders.chat_not_ready") ?? "Chat belum tersedia untuk order ini."}
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="mt-2 max-h-[260px] overflow-auto rounded-lg border border-gray-200 bg-white p-3"
          >
            {items.length === 0 && !loading ? (
              <div className="text-xs text-gray-500">
                {t("orders.no_messages") ?? "Belum ada pesan."}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((m) => {
                  const mine = isMine(m.authorName);
                  return (
                    <div
                      key={String(m.id)}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={[
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          mine
                            ? "bg-green-500 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm",
                        ].join(" ")}
                      >
                        {!mine && (
                          <div className="mb-0.5 text-[11px] font-semibold text-gray-600">
                            {m.authorName ?? "—"}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        {m.date && (
                          <div
                            className={`mt-1 text-[10px] ${
                              mine ? "text-green-100" : "text-gray-500"
                            } text-right`}
                          >
                            {m.date}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {err && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {err}
            </div>
          )}

          <div className="mt-3">
            <FieldTextarea
              label={t("orders.message") ?? "Message"}
              value={draft}
              onChange={setDraft}
              rows={2}
              placeholder={t("orders.type_message") ?? "Tulis pesan…"}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft("")}
                disabled={sending || !draft.trim()}
              >
                {t("common.clear") ?? "Clear"}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={send}
                disabled={sending || !draft.trim()}
              >
                {sending
                  ? t("common.sending") ?? "Sending…"
                  : t("common.send") ?? "Send"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatterPanel;
