import React, { useMemo } from 'react';
import { normalizeName } from '../api/jotform';

function extractPeople(data) {
  const map = new Map(); // normalizedName → { displayName, counts }

  function add(rawName, type) {
    if (!rawName || !rawName.trim()) return;
    const key = normalizeName(rawName);
    if (!map.has(key)) {
      map.set(key, { displayName: rawName.trim(), counts: {}, total: 0 });
    }
    const entry = map.get(key);
    entry.counts[type] = (entry.counts[type] || 0) + 1;
    entry.total += 1;
  }

  data.checkins.forEach((e) => add(e.personName, 'checkin'));
  data.messages.forEach((e) => {
    add(e.senderName, 'message');
    add(e.recipientName, 'message');
  });
  data.sightings.forEach((e) => {
    add(e.personName, 'sighting');
    if (e.seenWith) e.seenWith.split(/[,;]/).forEach((n) => add(n.trim(), 'sighting'));
  });
  data.notes.forEach((e) => {
    add(e.authorName, 'note');
    if (e.mentionedPeople)
      e.mentionedPeople.split(/[,;]/).forEach((n) => add(n.trim(), 'note'));
  });
  data.tips.forEach((e) => add(e.suspectName, 'tip'));

  return Array.from(map.entries())
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => b.total - a.total);
}

const TYPE_COLORS = {
  checkin: '#3b82f6',
  message: '#8b5cf6',
  sighting: '#f59e0b',
  note: '#10b981',
  tip: '#ef4444',
};

export function PersonList({ data, selectedKey, onSelect, searchQuery }) {
  const people = useMemo(() => extractPeople(data), [data]);

  const filtered = useMemo(() => {
    if (!searchQuery) return people;
    const q = searchQuery.toLowerCase();
    return people.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [people, searchQuery]);

  return (
    <div className="person-list">
      <div className="panel-title">PERSONS OF INTEREST <span className="count">({filtered.length})</span></div>
      {filtered.map((person) => (
        <div
          key={person.key}
          className={`person-item ${selectedKey === person.key ? 'selected' : ''}`}
          onClick={() => onSelect(person.key)}
        >
          <div className="person-name">{person.displayName}</div>
          <div className="person-badges">
            {Object.entries(person.counts).map(([type, count]) => (
              <span
                key={type}
                className="mini-badge"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              >
                {count} {type}
              </span>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div className="empty-state">No persons found.</div>}
    </div>
  );
}
