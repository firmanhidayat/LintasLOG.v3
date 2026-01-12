"use client";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import clsx from "clsx";
import { formatBytes, validateAndMergeFiles } from "@/lib/uploadUtils";
import { PaperclipIcon, XIcon, pickFileIcon } from "@/lib/fileIcons";

/** ===== Types ===== */

export type ExistingFileItem = {
  id: number;
  name: string;
  url: string;
  mimetype?: string;
  groupId?: number;
};

type MultiFileUploadProps = {
  label: string;
  value: File[];
  onChange: (files: File[]) => void;
  hint?: string;
  otherTerms?: string;
  accept?: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
  allowDuplicates?: boolean;
  disabled?: boolean;
  droppable?: boolean;
  emptyPlaceholder?: React.ReactNode;
  className?: string;
  onReject?: (messages: string[]) => void;
  showImagePreview?: boolean;
  existingItems?: ExistingFileItem[];
  existingHeader?: string;
  onRemoveExisting?: (item: ExistingFileItem) => void;
};

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

export default function MultiFileUpload({
  label,
  value,
  onChange,
  hint = "Maks. 10 MB per file.",
  otherTerms = "",
  accept = "",
  maxFiles,
  maxFileSizeMB = 10,
  allowDuplicates = false,
  disabled = false,
  droppable = true,
  emptyPlaceholder,
  className,
  onReject,
  showImagePreview = true,
  existingItems,
  existingHeader,
  onRemoveExisting,
}: MultiFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const hasExisting = !!existingItems?.length;
  const hasNew = value.length > 0;
  const isEmpty = !hasExisting && !hasNew;

  useEffect(() => {
    if (errors.length) {
      const t = setTimeout(() => setErrors([]), 4000);
      return () => clearTimeout(t);
    }
  }, [errors]);
  const pushErrors = useCallback(
    (msgs: string[]) => {
      if (!msgs.length) return;
      setErrors((prev) => [...prev, ...msgs]);
      onReject?.(msgs);
    },
    [onReject]
  );
  const handleAppendFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;

      const { accepted, rejectedMessages } = validateAndMergeFiles(
        value,
        incoming,
        {
          maxFileSizeMB,
          accept,
          allowDuplicates,
        }
      );

      let finalAccepted = accepted;
      const extraErrors: string[] = [];
      if (
        typeof maxFiles === "number" &&
        maxFiles >= 0 &&
        accepted.length > maxFiles
      ) {
        finalAccepted = accepted.slice(0, maxFiles);
        extraErrors.push(
          `Maksimal ${maxFiles} file. ${
            accepted.length - maxFiles
          } file lainnya diabaikan.`
        );
      }

      pushErrors([...rejectedMessages, ...extraErrors]);

      onChange(finalAccepted);
    },
    [
      accept,
      allowDuplicates,
      maxFiles,
      maxFileSizeMB,
      onChange,
      pushErrors,
      value,
    ]
  );
  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);
  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []);
    handleAppendFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeAt = (idx: number) => {
    if (disabled) return;
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };
  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!droppable || disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = () => {
    if (!droppable || disabled) return;
    setIsDragging(false);
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!droppable || disabled) return;
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    handleAppendFiles(files);
  };
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!showImagePreview) return;
    const map: Record<string, string> = {};
    value.forEach((f) => {
      if (isImageFile(f)) {
        map[fileKey(f)] = URL.createObjectURL(f);
      }
    });
    setThumbs(map);
    return () => {
      Object.values(map).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value, showImagePreview]);

  const filesCountInfo = useMemo(() => {
    const existingCount = existingItems?.length ?? 0;
    const total = value.length + existingCount;
    const limitInfo =
      typeof maxFiles === "number" && maxFiles >= 0 ? ` / ${maxFiles}` : "";
    return `${total}${limitInfo} file`;
  }, [value.length, maxFiles, existingItems]);

  return (
    <div className={clsx(className)}>
      <label className="mt-2 block text-sm font-extrabold text-black">{label}</label>
      <div className="mt-2 rounded-2xl border-2 border-dashed font-extrabold bg-primary/10 transition">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={onInputChange}
          className="hidden"
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? openPicker() : null
          }
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={clsx(
            "flex items-start justify-between gap-3 px-4 py-3 rounded-2xl",
            droppable && !disabled && "hover:bg-gray-50 active:scale-[0.99]",
            isDragging && "border-primary bg-primary/5",
            disabled && "cursor-not-allowed opacity-60"
          )}
          aria-disabled={disabled}
        >
          {/* KIRI */}
          <div className="flex flex-1 min-w-0 items-start gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300">
              <PaperclipIcon className="h-4 w-4" />
            </div>

            <div className="min-w-0 w-full">
              <div className="text-sm font-medium text-gray-800 break-words">
                {disabled
                  ? "Upload dimatikan"
                  : "Klik untuk pilih atau tarik file ke sini"}
              </div>
              <div className="text-xs font-extralight text-gray-500 break-words">
                {hint || "Maks. 10 MB per file."}
                
                {accept && (
                  <>
                    &nbsp;•&nbsp; Tipe:{" "}
                    <span className="break-all">{accept}</span>
                  </>
                )}
                {otherTerms && (
                  <div className="mt-6 text-md whitespace-pre-line leading-relaxed">
                    {otherTerms || ""}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KANAN */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 truncate max-w-[10rem]">
              {filesCountInfo}
            </span>
            {!!value.length && (
              <button
                type="button"
                onClick={clearAll}
                disabled={disabled}
                className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                title="Hapus semua file baru"
              >
                <XIcon className="mr-1 h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List files (existing + new) */}
        <div className="px-3 pb-3">
          {isEmpty ? (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {emptyPlaceholder ?? "Belum ada file."}
            </div>
          ) : (
            <>
              {hasExisting && (
                <>
                  <div className="mt-3 text-xs font-semibold text-gray-600">
                    {existingHeader ?? "File terlampir (server)"}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {existingItems!.map((item) => {
                      const Icon = pickFileIcon(item.name, item.mimetype ?? "");
                      const img =
                        showImagePreview &&
                        (item.mimetype?.startsWith("image/") ||
                          isImageUrl(item.url));

                      return (
                        <li
                          key={`existing-${item.id}`}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
                        >
                          <div className="flex flex-1 min-w-0 items-center gap-3">
                            {img ? (
                              <img
                                src={item.url}
                                alt={item.name}
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <Icon className="h-5 w-5 shrink-0" />
                            )}

                            <div className="min-w-0 flex-1">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm font-medium text-primary-700 hover:underline"
                              >
                                {item.name}
                              </a>
                              <div className="text-[11px] text-gray-500">
                                {item.mimetype || "server file"}
                              </div>
                            </div>
                          </div>

                          {onRemoveExisting && (
                            <button
                              type="button"
                              onClick={() => onRemoveExisting(item)}
                              disabled={disabled}
                              className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
                              title="Hapus file ini dari server"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {hasNew && (
                <ul
                  className={clsx("space-y-2", hasExisting ? "mt-3" : "mt-3")}
                >
                  {value.map((f, idx) => {
                    const Icon = pickFileIcon(f.name, f.type);
                    const key = fileKey(f);
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
                      >
                        <div className="flex flex-1 min-w-0 items-center gap-3">
                          {showImagePreview && isImageFile(f) ? (
                            <img
                              src={thumbs[key]}
                              alt={f.name}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <Icon className="h-5 w-5 shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-gray-800">
                              {f.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatBytes(f.size)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          disabled={disabled}
                          aria-label={`Remove ${f.name}`}
                          title="Hapus file baru ini"
                          className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-red-600">
              {errors.map((msg, i) => (
                <li key={i}>• {msg}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
