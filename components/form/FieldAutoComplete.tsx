"use client";
import React, { useEffect, useMemo, useRef, useId } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import clsx from "clsx";
import { RecordItem } from "@/types/recorditem";

// export type AutoItem = { id: number; name: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  options: RecordItem[];
  loading?: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  selected?: RecordItem | null;
  onPick: (item: RecordItem) => void;
  error?: string;
  touched?: boolean;
  onBlurValidate?: () => void;
  inputRef?:
    | React.RefObject<HTMLInputElement>
    | React.MutableRefObject<HTMLInputElement | null>;
  listboxId?: string;
  required?: boolean; // <-- optional, default true
};

export function FieldAutocomplete({
  value,
  onChange,
  placeholder,
  ariaLabel,
  options,
  loading,
  open,
  setOpen,
  selected,
  onPick,
  error,
  touched,
  onBlurValidate,
  inputRef,
  listboxId,
  required = true,
}: Props) {
  const listRef = useRef<HTMLUListElement | null>(null);

  const uid = useId();
  const lbId = listboxId ?? `listbox-${uid}`;

  const outsideRefs = useMemo(
    () => [listRef, inputRef ?? null],
    [listRef, inputRef]
  );
  useClickOutside(outsideRefs, () => setOpen(false), open);

  const isInvalid = Boolean(touched && error);

  useEffect(() => {
    if (open && value.length < 2) setOpen(false);
  }, [open, value, setOpen]);

  return (
    <div className="grid gap-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={clsx(
            "w-full rounded-md border border-gray-300 text-sm px-3 py-1  outline-none focus:ring-2 focus:ring-primary/40",
            isInvalid && "border-red-400 focus:ring-red-200"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlurValidate}
          onFocus={() => value.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={lbId}
          aria-invalid={isInvalid}
          required={required}
        />
        {open && (
          <ul
            id={lbId}
            ref={listRef}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow"
          >
            {loading && (
              <li className="px-3 py-2 text-sm text-gray-500">Loading…</li>
            )}
            {!loading && options.length === 0 && value.length >= 2 && (
              <li className="px-3 py-2 text-sm text-gray-500">No results</li>
            )}
            {options.map((d) => (
              <li
                key={d.id}
                role="option"
                aria-selected={selected?.id === d.id}
                className={clsx(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-gray-100",
                  selected?.id === d.id && "bg-gray-50"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(d)}
                title={d.name}
              >
                {d.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isInvalid && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
