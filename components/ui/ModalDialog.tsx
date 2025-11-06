import Button from "@/components/ui/Button";

/** ===== NEW: Lightweight ModalDialog (seragam dengan Fleet/Driver) ===== */
export function ModalDialog({
  open,
  kind = "success",
  title,
  message,
  onClose,
}: {
  open: boolean;
  kind?: "success" | "error";
  title: string;
  message: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  const ring = kind === "success" ? "ring-green-500" : "ring-red-500";
  const head = kind === "success" ? "text-green-700" : "text-red-700";
  const btn =
    kind === "success"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-red-600 hover:bg-red-700";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ${ring}`}
      >
        <div className={`mb-2 text-lg font-semibold ${head}`}>{title}</div>
        <div className="mb-4 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-white ${btn} focus:outline-none focus:ring`}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
