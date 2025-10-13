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
type MultiFileUploadProps = {
  /** Label di atas komponen */
  label: string;
  /** Daftar file terpilih (controlled) */
  value: File[];
  /** Callback saat daftar file berubah */
  onChange: (files: File[]) => void;

  /** Hint/ketentuan di bawah tombol upload */
  hint?: string;

  /** "accept" input file, ex: ".pdf,.doc,.docx", "image/*" */
  accept?: string;

  /** Maks jumlah file. Default: tidak dibatasi */
  maxFiles?: number;

  /** Maks ukuran file (MB) per file. Default: 10 MB */
  maxFileSizeMB?: number;

  /** Izinkan duplikat (berdasarkan name+size+lastModified). Default: false */
  allowDuplicates?: boolean;

  /** Nonaktifkan komponen */
  disabled?: boolean;

  /** Izinkan drag & drop area. Default: true */
  droppable?: boolean;

  /** Placeholder saat list kosong */
  emptyPlaceholder?: React.ReactNode;

  /** ClassName pembungkus utama */
  className?: string;

  /** Callback error/penolakan (opsional) */
  onReject?: (messages: string[]) => void;

  /** Tampilkan preview image kecil untuk file image/* . Default: true */
  showImagePreview?: boolean;
};

/** ===== Utils kecil ===== */
function fileKey(f: File) {
  return `${f.name}__${f.size}__${f.lastModified}`;
}

function isImageFile(f: File) {
  return f.type.startsWith("image/");
}

/** ===== Komponen ===== */
export default function MultiFileUpload({
  label,
  value,
  onChange,
  hint = "Maks. 10 MB per file.",
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
}: MultiFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  /** Bersihkan pesan error saat props/aksi baru */
  useEffect(() => {
    if (errors.length) {
      const t = setTimeout(() => setErrors([]), 4000);
      return () => clearTimeout(t);
    }
  }, [errors]);

  /** Buat pesan error sekaligus forward ke onReject jika ada */
  const pushErrors = useCallback(
    (msgs: string[]) => {
      if (!msgs.length) return;
      setErrors((prev) => [...prev, ...msgs]);
      onReject?.(msgs);
    },
    [onReject]
  );

  /** Filter + merge + validasi */
  const handleAppendFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;

      // Validasi via util (ukuran + tipe + duplikat)
      // validateAndMergeFiles(prev, files, options?)
      // Untuk fleksibilitas, kita kasih opsi custom di sini
      // 1) Validasi tipe & size dan merge + dedup (pakai util project)
      const { accepted, rejectedMessages } = validateAndMergeFiles(
        value,
        incoming,
        {
          maxFileSizeMB,
          accept,
          allowDuplicates,
        }
      );

      // 2) Batasi jumlah total file bila maxFiles diset
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

      // 3) Laporkan error (tipe/size/limit/duplikat)
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

  /** Buka dialog file */
  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  /** Input change handler */
  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []);
    handleAppendFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  /** Remove satu item */
  const removeAt = (idx: number) => {
    if (disabled) return;
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  };

  /** Clear semua */
  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  /** Drag & drop */
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

  /** Previews (objectURL) untuk image */
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!showImagePreview) return;
    // Buat objectURL cuma untuk file image/*
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
    const total = value.length;
    const limitInfo =
      typeof maxFiles === "number" && maxFiles >= 0 ? ` / ${maxFiles}` : "";
    return `${total}${limitInfo} file`;
  }, [value.length, maxFiles]);

  return (
    <div className={clsx(className)}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Picker + DnD */}
      <div
        className={clsx(
          "mt-2 rounded-2xl border-2 border-dashed bg-white transition"
        )}
      >
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
            "flex cursor-pointer items-center justify-between gap-3 px-4 py-3",
            "rounded-2xl",
            droppable && !disabled && "hover:bg-gray-50 active:scale-[0.99]",
            isDragging && "border-primary bg-primary/5",
            disabled && "cursor-not-allowed opacity-60"
          )}
          aria-disabled={disabled}
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300">
              <PaperclipIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {disabled
                  ? "Upload dimatikan"
                  : "Klik untuk pilih atau tarik file ke sini"}
              </div>
              <div className="text-xs font-extralight text-gray-500">
                {hint || "Maks. 10 MB per file."}
                {accept && <> &nbsp;•&nbsp; Tipe: {accept}</>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{filesCountInfo}</span>
            {!!value.length && (
              <button
                type="button"
                onClick={clearAll}
                disabled={disabled}
                className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                title="Hapus semua"
              >
                <XIcon className="mr-1 h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List files */}
        <div className="px-3 pb-3">
          {value.length === 0 ? (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {emptyPlaceholder ?? "Belum ada file yang dipilih."}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {value.map((f, idx) => {
                const Icon = pickFileIcon(f.name, f.type);
                const key = fileKey(f);
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/70 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Ikon atau preview image */}
                      {showImagePreview && isImageFile(f) ? (
                        <img
                          src={thumbs[key]}
                          alt={f.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <Icon className="h-5 w-5 shrink-0" />
                      )}

                      <div className="min-w-0">
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
                      title="Remove"
                      className="ml-3 inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Error messages */}
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
