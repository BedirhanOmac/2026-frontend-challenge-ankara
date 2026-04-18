import React from 'react';

export function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-icon">⌕</span>
      <input
        className="search-input"
        type="text"
        placeholder="Search by name, location, or keyword..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}
