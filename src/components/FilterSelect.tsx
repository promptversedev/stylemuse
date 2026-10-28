"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./FilterSelect.module.css";

export { styles as filterStyles };

export type FilterOption = { value: string; count: number };

/**
 * A dropdown for one filter, styled to match the app instead of the browser's
 * native list. Follows the ARIA listbox pattern: arrows move, Enter or Space
 * picks, Escape or a click outside closes, Home/End jump, typing a letter
 * jumps to the next option starting with it.
 */
export function FilterSelect({
  label,
  value,
  options,
  total,
  onChange,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  /** Count shown beside "All". */
  total: number;
  onChange: (next: string | null) => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  // Row 0 is "All", then one row per option.
  const rows: { value: string | null; text: string; count: number }[] = [
    { value: null, text: "All", count: total },
    ...options.map((o) => ({ value: o.value, text: o.value, count: o.count })),
  ];
  const selectedIndex = Math.max(0, rows.findIndex((r) => r.value === value));
  const current = rows[selectedIndex];

  const place = useCallback(() => {
    const box = triggerRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = Math.max(box.width, 240);
    // Keep the menu on screen when the trigger sits at the right edge.
    const left = Math.min(box.left, window.innerWidth - width - 8);
    setPosition({ top: box.bottom + 6, left: Math.max(8, left), minWidth: width });
  }, []);

  const openMenu = () => {
    place();
    setHighlight(selectedIndex);
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    onChange(rows[index].value);
    close();
  };

  // Close on an outside click, or when anything scrolls or resizes — the menu
  // is fixed to where the trigger was.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    const onMove = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  // Scrolls the menu only: scrollIntoView would also scroll every scrollable
  // ancestor, and any outside scroll closes the menu.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const row = menu?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    if (!open || !menu || !row) return;
    if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop - 6;
    else if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight)
      menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight + 6;
  }, [open, highlight]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => Math.min(rows.length - 1, h + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(rows.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(highlight);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const k = e.key.toLowerCase();
          const start = highlight + 1;
          for (let i = 0; i < rows.length; i++) {
            const j = (start + i) % rows.length;
            if (rows[j].text.toLowerCase().startsWith(k)) {
              setHighlight(j);
              break;
            }
          }
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        data-active={value !== null}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-activedescendant={open ? `${id}-opt-${highlight}` : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <span className={styles.triggerValue}>{current.text}</span>
        <span className={styles.triggerCount}>{current.count}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Rendered on <body>: outside the filter bar, which scrolls sideways
          and would otherwise clip the menu or close it when it scrolls. */}
      {open && position && createPortal(
        <ul
          ref={menuRef}
          id={`${id}-menu`}
          role="listbox"
          aria-label={label}
          className={styles.menu}
          style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
        >
          {rows.map((row, i) => (
            <li key={row.value ?? "__all"} role="none">
              <div
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === selectedIndex}
                data-highlighted={i === highlight}
                className={styles.option}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <svg className={styles.check} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className={styles.optionText}>{row.text}</span>
                <span className={styles.optionCount}>{row.count}</span>
              </div>
              {i === 0 && rows.length > 1 && <div className={styles.divider} role="presentation" />}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
