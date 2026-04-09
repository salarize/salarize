import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';

/**
 * CustomSelect - A modern, performant dropdown component
 * - Optimized with memo and useCallback to prevent unnecessary re-renders
 * - Smooth animations
 * - Optional search for long lists
 */

// Icon for department items
const DeptIcon = ({ isSpecial, isSelected }) => (
  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
    isSelected
      ? 'bg-violet-500 text-white'
      : isSpecial
        ? 'bg-amber-500/20 text-amber-400'
        : 'bg-violet-500/20 text-violet-400'
  }`}>
    {isSpecial ? (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )}
  </div>
);

// Memoized option item to prevent re-renders
const OptionItem = memo(({ option, isSelected, isHighlighted, onSelect, onHover, index, showIcons }) => {
  const isSpecial = option.value === 'all' || option.value === 'unassigned' || option.value === '';

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      onMouseEnter={() => onHover(index)}
      className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-150 ${
        isHighlighted
          ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white'
          : isSelected
            ? 'bg-violet-500/10 text-white'
            : 'text-slate-300 hover:bg-slate-700/30'
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3">
        {showIcons && <DeptIcon isSpecial={isSpecial} isSelected={isSelected} />}
        <span className={`flex-1 truncate ${option.value === '' ? 'text-slate-400 italic' : ''}`}>
          {option.label}
        </span>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
});

OptionItem.displayName = 'OptionItem';

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  disabled = false,
  variant = "default", // "default" | "warning" | "compact" | "violet"
  className = "",
  dropdownPosition = "auto", // "auto" | "bottom" | "top"
  searchable = false, // Enable search for long lists
  showIcons = false // Show department icons
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);

  // Memoize selected option
  const selectedOption = useMemo(() =>
    options.find(opt => opt.value === value),
    [options, value]
  );

  const displayLabel = selectedOption?.label || placeholder;
  const isPlaceholder = !selectedOption;

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(term)
    );
  }, [options, searchTerm, searchable]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
      const isOutsideDropdown = listRef.current && !listRef.current.contains(e.target);
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(i => Math.min(i + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex].value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const list = listRef.current;
      const item = list.querySelector(`[data-index="${highlightedIndex}"]`);
      if (item) {
        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const listScrollTop = list.scrollTop;
        const listHeight = list.clientHeight;

        if (itemTop < listScrollTop) {
          list.scrollTop = itemTop;
        } else if (itemBottom > listScrollTop + listHeight) {
          list.scrollTop = itemBottom - listHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const horizontalPadding = 8;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(filteredOptions.length * 42 + (searchable ? 52 : 8), 280);
      const desiredWidth = Math.max(rect.width, 180);
      const width = Math.min(desiredWidth, viewportWidth - horizontalPadding * 2);

      let showOnTop = dropdownPosition === "top";
      if (dropdownPosition === "auto") {
        showOnTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      }

      const left = Math.min(
        Math.max(rect.left, horizontalPadding),
        viewportWidth - width - horizontalPadding
      );
      const top = showOnTop
        ? Math.max(8, rect.top - dropdownHeight - 4)
        : rect.bottom + 4;

      setDropdownStyle({
        position: 'fixed',
        left,
        width,
        top,
        maxHeight: showOnTop ? Math.min(spaceAbove - 8, 280) : Math.min(spaceBelow - 8, 280),
      });

      // Focus search input when opening
      if (searchable) {
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    }
  }, [isOpen, filteredOptions.length, dropdownPosition, searchable]);

  const handleSelect = useCallback((val) => {
    onChange(val);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setSearchTerm('');
  }, [onChange]);

  const handleHover = useCallback((index) => {
    setHighlightedIndex(index);
  }, []);

  const toggleOpen = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
    if (!isOpen) {
      const idx = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [disabled, isOpen, options, value]);

  // Variant styles
  const getButtonStyles = () => {
    const base = "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200";

    if (disabled) {
      return `${base} cursor-not-allowed opacity-50 bg-slate-800 border border-slate-700 text-slate-400`;
    }

    if (variant === "violet") {
      return `${base} cursor-pointer bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]`;
    }

    if (variant === "warning" || (isPlaceholder && variant !== "compact")) {
      return `${base} cursor-pointer bg-slate-800/80 border border-slate-600/50 text-slate-400 hover:border-violet-500/50 hover:bg-slate-800`;
    }

    return `${base} cursor-pointer bg-slate-800/80 border border-slate-600/50 text-white hover:border-violet-500/50 hover:bg-slate-800`;
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
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${variant === 'violet' ? 'text-white/80' : 'text-slate-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu - Portal */}
      {isOpen && createPortal(
        <div
          style={dropdownStyle}
          className="z-[9999] bg-slate-900/95 backdrop-blur-xl border border-violet-500/20 rounded-xl shadow-2xl shadow-violet-500/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          role="listbox"
        >
          {/* Header gradient line */}
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />

          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-slate-700/50">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div ref={listRef} className="overflow-y-auto py-1" style={{ maxHeight: searchable ? 'calc(100% - 60px)' : '100%' }}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aucun résultat
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div key={option.value} data-index={index}>
                  <OptionItem
                    option={option}
                    isSelected={option.value === value}
                    isHighlighted={index === highlightedIndex}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    index={index}
                    showIcons={showIcons}
                  />
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(CustomSelect);
