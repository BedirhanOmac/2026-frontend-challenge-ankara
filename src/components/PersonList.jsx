import React, { useMemo } from 'react';
import { getPersonKey, normalizeName } from '../api/jotform';

// Generic/placeholder names to suppress from the person list
const BLACKLIST = new Set(['unknown', 'event staff', 'bilinmiyor', 'staff', 'anonymous', 'n/a']);

function isBlacklisted(name) {
  return !name || BLACKLIST.has(normalizeName(name.trim()));
}

function formatTime(date) {
  if (!date) return null;
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function extractPeople(data) {
  const map = new Map(); // personKey → { displayName, counts, total }
  const lastSeen = new Map(); // personKey → { seenWith, timestamp, location }

  function add(rawName, type) {
    const trimmed = rawName?.trim();
    if (!trimmed || isBlacklisted(trimmed)) return;
    const key = getPersonKey(trimmed);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { displayName: trimmed, counts: {}, total: 0 });
    } else {
      // Prefer the longer/more complete display name (e.g. "Kağan A." over "Kağan")
      if (trimmed.length > map.get(key).displayName.length) {
        map.get(key).displayName = trimmed;
      }
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

    // Track last seen: subject was seen with companion
    const subjectKey = getPersonKey(e.personName);
    if (subjectKey && !isBlacklisted(e.personName)) {
      const prev = lastSeen.get(subjectKey);
      if (!prev || (e.timestamp && (!prev.timestamp || e.timestamp > prev.timestamp))) {
        lastSeen.set(subjectKey, { seenWith: e.seenWith, timestamp: e.timestamp, location: e.location });
      }
    }
    // Track last seen for companions too
    if (e.seenWith) {
      e.seenWith.split(/[,;]/).forEach((n) => {
        const companionKey = getPersonKey(n.trim());
        if (!companionKey || isBlacklisted(n.trim())) return;
        const prev = lastSeen.get(companionKey);
        if (!prev || (e.timestamp && (!prev.timestamp || e.timestamp > prev.timestamp))) {
          lastSeen.set(companionKey, { seenWith: e.personName, timestamp: e.timestamp, location: e.location });
        }
      });
    }
  });
  data.notes.forEach((e) => {
    add(e.authorName, 'note');
    if (e.mentionedPeople)
      e.mentionedPeople.split(/[,;]/).forEach((n) => add(n.trim(), 'note'));
  });
  data.tips.forEach((e) => add(e.suspectName, 'tip'));

  return Array.from(map.entries())
    .map(([key, val]) => ({ key, ...val, lastSeen: lastSeen.get(key) || null }))
    .sort((a, b) => b.total - a.total);
}

const TYPE_COLORS = {
  checkin: '#0a1551',
  message: '#7c3aed',
  sighting: '#ff6100',
  note: '#059669',
  tip: '#e02020',
};

export function PersonList({ data, selectedKey, onSelect, searchQuery }) {
  const people = useMemo(() => extractPeople(data), [data]);

  const filtered = useMemo(() => {
    if (!searchQuery) return people;
    const q = normalizeName(searchQuery);
    return people.filter((p) => normalizeName(p.displayName).includes(q));
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
              <span key={type} className="mini-badge" style={{ backgroundColor: TYPE_COLORS[type] }}>
                {count} {type}
              </span>
            ))}
          </div>
          {person.lastSeen && (
            <div className="person-last-seen">
              Last seen with: <strong>{person.lastSeen.seenWith || '—'}</strong>
              {person.lastSeen.location ? ` · ${person.lastSeen.location}` : ''}
              {person.lastSeen.timestamp ? ` · ${formatTime(person.lastSeen.timestamp)}` : ''}
            </div>
          )}
        </div>
      ))}
      {filtered.length === 0 && <div className="empty-state">No persons found.</div>}
    </div>
  );
}
