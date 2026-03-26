"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import styles from "./datepicker.module.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ name, value, onChange, placeholder = "Select date", required }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // currentView tracks which month/year the calendar popover is showing
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDate = (day) => {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Calendar logic
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const today = new Date();
  
  // Format the selected value for the input display
  let displayValue = "";
  let selectedY = null, selectedM = null, selectedD = null;
  
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) { // Valid date
      selectedY = d.getFullYear();
      selectedM = d.getMonth();
      selectedD = d.getDate();
      
      // If strictly YYYY-MM-DD string, parse locally to avoid UTC timezone shifts
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        selectedY = parseInt(value.split('-')[0], 10);
        selectedM = parseInt(value.split('-')[1], 10) - 1;
        selectedD = parseInt(value.split('-')[2], 10);
      }
      
      const dateObj = new Date(selectedY, selectedM, selectedD);
      displayValue = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {/* Hidden input to ensure standard form submission works natively */}
      <input type="hidden" name={name} value={value || ""} required={required} />
      
      <div 
        className={styles.inputContainer} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ borderColor: isOpen ? "#18181b" : "#e4e4e7" }}
      >
        <CalendarIcon size={16} color="#71717a" />
        <span className={value ? styles.inputText : `${styles.inputText} ${styles.placeholder}`}>
          {displayValue || placeholder}
        </span>
      </div>

      {isOpen && (
        <div className={styles.popover}>
          {/* Header Controls */}
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

          {/* Days of Week */}
          <div className={styles.weekDays}>
            {DAYS.map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
          </div>

          {/* Days Grid */}
          <div className={styles.daysGrid}>
            {/* Empty slots before first day of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.day} ${styles.empty}`} />
            ))}
            
            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = 
                dayNum === today.getDate() && 
                viewMonth === today.getMonth() && 
                viewYear === today.getFullYear();
                
              const isSelected = selectedY !== null && 
                selectedD === dayNum && 
                selectedM === viewMonth &&
                selectedY === viewYear;

              let className = styles.day;
              if (isSelected) className += ` ${styles.selected}`;
              else if (isToday) className += ` ${styles.today}`;

              return (
                <div 
                  key={`day-${dayNum}`} 
                  className={className}
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
