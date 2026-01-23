import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * CustomSelect - A modern dropdown component with clean styling
 * Replaces native <select> to avoid ugly OS default styles
 * Uses React Portal to render dropdown outside overflow containers
 */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  disabled = false,
  variant = "default", // "default" | "warning" | "compact" | "violet"
  className = "",
  dropdownPosition = "auto" // "auto" | "bottom" | "top"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const buttonRef = useRef(null);

  // Find selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;
  const isPlaceholder = !selectedOption;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is outside both the container AND the dropdown (portal)
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
      const isOutsideDropdown = listRef.current && !listRef.current.contains(e.target);

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(i => Math.min(i + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(options.length * 40 + 8, 240); // Estimate dropdown height

      // Determine position: auto, top, or bottom
      let showOnTop = dropdownPosition === "top";
      if (dropdownPosition === "auto") {
        showOnTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      }

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        top: showOnTop ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        maxHeight: showOnTop ? Math.min(spaceAbove - 8, 240) : Math.min(spaceBelow - 8, 240),
      });
    }
  }, [isOpen, options.length, dropdownPosition]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const toggleOpen = (e) => {
    if (disabled) return;
    e.preventDefault(); // Prevent any scroll behavior
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Set highlighted to current value
      const idx = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  };

  // Variant styles
  const getButtonStyles = () => {
    const base = "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all";

    if (disabled) {
      return `${base} cursor-not-allowed opacity-50 bg-slate-800 border border-slate-700 text-slate-400`;
    }

    if (variant === "violet") {
      return `${base} cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25`;
    }

    if (variant === "warning" || (isPlaceholder && variant !== "compact")) {
      return `${base} cursor-pointer bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-750`;
    }

    return `${base} cursor-pointer bg-slate-800 border border-slate-600 text-white hover:border-slate-500 hover:bg-slate-750`;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={getButtonStyles()}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${isPlaceholder ? 'text-slate-400' : ''}`}>
          {displayLabel}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu - rendered via Portal to escape overflow containers */}
      {isOpen && createPortal(
        <div
          style={dropdownStyle}
          className="z-[9999] py-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/30 overflow-y-auto"
          role="listbox"
          ref={listRef}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === highlightedIndex
                  ? 'bg-violet-500/20 text-white'
                  : option.value === value
                    ? 'bg-slate-700/50 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
              }`}
              role="option"
              aria-selected={option.value === value}
            >
              <div className="flex items-center justify-between">
                <span className={option.value === '' ? 'text-slate-400 italic' : ''}>
                  {option.label}
                </span>
                {option.value === value && (
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default CustomSelect;
