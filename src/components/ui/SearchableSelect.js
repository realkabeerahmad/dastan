"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import styles from "./SearchableSelect.module.css";

/**
 * SearchableSelect — fixed version.
 *
 * Changes from original:
 * - All inline style objects replaced with CSS module classes
 * - Dropdown background was rgba(255,255,255,0.03) — near-transparent, content bled through; now solid #111
 * - Focus ring was opaque rgba(244,244,245,1) — white block on dark input; now subtle dark-compatible ring
 * - Search divider was #f4f4f5 (light grey) — white line on dark dropdown; now rgba(255,255,255,0.08)
 * - z-index was hardcoded 50 — now uses CSS variable --z-dropdown
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  name,
  submitId = false,
  required,
  disabled,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.name === value);

  return (
    <div
      className={styles.container}
      ref={dropdownRef}
    >
      {/* Hidden input for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={submitId ? selectedOption?.id ?? "" : value ?? ""}
          required={required}
        />
      )}

      <button
        type="button"
        className={[
          styles.trigger,
          isOpen ? styles.triggerOpen : "",
          disabled ? styles.triggerDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={[styles.triggerText, !selectedOption ? styles.placeholder : ""].filter(Boolean).join(" ")}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={[styles.chevron, isOpen ? styles.chevronOpen : ""].filter(Boolean).join(" ")}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.noResults}>No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  role="option"
                  aria-selected={value === opt.name}
                  className={[
                    styles.option,
                    value === opt.name ? styles.optionSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {opt.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
