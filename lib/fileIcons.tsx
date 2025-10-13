// lib/fileIcons.tsx
import React from "react";

/* lightweight inline icons (same as your component) */
export function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12V7a5 5 0 10-10 0v9a3 3 0 106 0V8"
      />
    </svg>
  );
}
export function FileGenericIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeWidth="2"
        d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"
      />
      <path strokeWidth="2" d="M14 3v6h6" />
    </svg>
  );
}
export function FilePdfIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
      <path strokeWidth="2" d="M7 9h4a2 2 0 010 4H9v4M13 17v-8h4" />
    </svg>
  );
}
export function FileImageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
      <circle cx="9" cy="9" r="2" strokeWidth="2" />
      <path strokeWidth="2" d="M21 15l-5-5-11 11" />
    </svg>
  );
}
export function FileWordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
      <path strokeWidth="2" d="M7 8l2 8 2-6 2 6 2-8" />
    </svg>
  );
}
export function FileExcelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
      <path strokeWidth="2" d="M8 8l8 8M16 8l-8 8" />
    </svg>
  );
}
export function FileZipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="6" y="3" width="12" height="18" rx="2" strokeWidth="2" />
      <path strokeWidth="2" d="M12 3v18M10 6h4M10 10h4M10 14h4" />
    </svg>
  );
}

/** pick icon component by extension/MIME */
export function pickFileIcon(name: string, type: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return FileImageIcon;
  if (ext === "pdf") return FilePdfIcon;
  if (["doc", "docx", "rtf", "odt"].includes(ext)) return FileWordIcon;
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return FileExcelIcon;
  if (["zip", "rar", "7z"].includes(ext)) return FileZipIcon;
  return FileGenericIcon;
}
