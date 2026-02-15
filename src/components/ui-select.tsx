"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SelectValue = string | number;

export type SelectOption<T extends SelectValue> = {
  label: string;
  value: T;
  avatarUrl?: string | null;
  description?: string;
};

type UiSelectProps<T extends SelectValue> = {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function UiSelect<T extends SelectValue>({
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: UiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`ui-dropdown ${className}`.trim()}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="ui-dropdown-trigger"
      >
        {selectedOption ? (
          <span className="ui-option-row">
            {selectedOption.avatarUrl ? (
              <img src={selectedOption.avatarUrl} alt="" className="ui-option-avatar" />
            ) : null}
            <span className="ui-option-text">
              <span className="ui-option-label">{selectedOption.label}</span>
              {selectedOption.description ? (
                <span className="ui-option-meta">{selectedOption.description}</span>
              ) : null}
            </span>
          </span>
        ) : (
          <span>Select an option</span>
        )}
        <span aria-hidden className={`ui-dropdown-chevron${open ? " open" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="ui-dropdown-menu" role="listbox">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={active}
                className={`ui-dropdown-option${active ? " active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="ui-option-row">
                  {option.avatarUrl ? (
                    <img src={option.avatarUrl} alt="" className="ui-option-avatar" />
                  ) : null}
                  <span className="ui-option-text">
                    <span className="ui-option-label">{option.label}</span>
                    {option.description ? <span className="ui-option-meta">{option.description}</span> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
