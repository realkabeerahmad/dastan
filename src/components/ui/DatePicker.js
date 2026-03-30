"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import styles from "./datepicker.module.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ name, value, onChange, placeholder = "Select date", required }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewMonth((m) => (m === 0 ? (setViewYear((y) => y - 1), 11) : m - 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewMonth((m) => (m === 11 ? (setViewYear((y) => y + 1), 0) : m + 1));
  };

  const selectDate = (day) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();

  let displayValue = "";
  let selectedY = null, selectedM = null, selectedD = null;

  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      // Parse locally to avoid UTC timezone shifts on YYYY-MM-DD strings
      if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        [selectedY, selectedM, selectedD] = value.split("-").map(Number);
        selectedM -= 1; // 0-indexed
      } else {
        selectedY = d.getFullYear();
        selectedM = d.getMonth();
        selectedD = d.getDate();
      }
      displayValue = new Date(selectedY, selectedM, selectedD).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
    }
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <input type="hidden" name={name} value={value || ""} required={required} />

      {/* FIX: removed inline style={{ borderColor: isOpen ? "#18181b" : "#e4e4e7" }}
          Those were light-theme values that overrode the CSS module's dark styles.
          Open state is now handled purely via the .inputContainerOpen modifier class. */}
      <div
        className={[styles.inputContainer, isOpen ? styles.inputContainerOpen : ""].filter(Boolean).join(" ")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon size={16} className={styles.calendarIcon} />
        <span className={[styles.inputText, !value ? styles.placeholder : ""].filter(Boolean).join(" ")}>
          {displayValue || placeholder}
        </span>
      </div>

      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.header}>
            <button type="button" className={styles.navButton} onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <div className={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button type="button" className={styles.navButton} onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.weekDays}>
            {DAYS.map((d) => <div key={d} className={styles.weekDay}>{d}</div>)}
          </div>

          <div className={styles.daysGrid}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.day} ${styles.empty}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday =
                dayNum === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              const isSelected =
                selectedY !== null &&
                selectedD === dayNum &&
                selectedM === viewMonth &&
                selectedY === viewYear;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={[
                    styles.day,
                    isSelected ? styles.selected : "",
                    !isSelected && isToday ? styles.today : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectDate(dayNum)}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
