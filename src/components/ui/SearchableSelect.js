"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...", 
  name, 
  submitId = false,
  required,
  disabled
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.name === value);

  return (
    <div className="searchable-select-container" ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Hidden input for form submission via FormData */}
      {name && (
        <input 
          type="hidden" 
          name={name} 
          value={submitId ? (selectedOption?.id || "") : (value || "")} 
          required={required} 
        />
      )}
      
      <div 
        className={`searchable-select-trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          border: isOpen ? "1px solid #a1a1aa" : "1px solid #e4e4e7",
          borderRadius: "8px", padding: "0.625rem 0.75rem",
          backgroundColor: disabled ? "#f4f4f5" : "#ffffff", cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "0.875rem", color: selectedOption ? "#09090b" : "#71717a",
          boxShadow: isOpen ? "0 0 0 2px rgba(244, 244, 245, 1)" : "none",
          transition: "all 0.2s ease"
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} color="#71717a" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          backgroundColor: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          zIndex: 50, maxHeight: "250px", display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "0.5rem", borderBottom: "1px solid #f4f4f5", display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#ffffff", borderTopLeftRadius: "8px", borderTopRightRadius: "8px" }}>
            <Search size={14} color="#a1a1aa" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: "none", outline: "none", width: "100%", fontSize: "0.875rem", color: "#09090b",
                backgroundColor: "transparent"
              }}
            />
            {searchTerm && <X size={14} color="#a1a1aa" style={{ cursor: "pointer" }} onClick={() => setSearchTerm("")} />}
          </div>
          
          <div style={{ overflowY: "auto", padding: "0.25rem 0", flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", color: "#71717a", textAlign: "center" }}>
                No results found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  style={{
                    padding: "0.5rem 1rem", fontSize: "0.875rem", color: "#18181b",
                    cursor: "pointer", backgroundColor: value === opt.name ? "#f4f4f5" : "transparent"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f4f4f5"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = value === opt.name ? "#f4f4f5" : "transparent"}
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
