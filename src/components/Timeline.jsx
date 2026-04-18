import React, { useMemo } from 'react';
import { normalizeName, getPersonKey } from '../api/jotform';

const BLACKLIST = new Set(['unknown', 'event staff', 'bilinmiyor', 'staff', 'anonymous', 'n/a']);

const TYPE_CONFIG = {
  checkin: { label: 'CHECK-IN', color: '#0a1551' },
  message: { label: 'MESSAGE', color: '#7c3aed' },
  sighting: { label: 'SIGHTING', color: '#ff6100' },
  note: { label: 'NOTE', color: '#059669' },
  tip: { label: 'TIP', color: '#e02020' },
};

const URGENCY_COLORS = {
  high: '#e02020',
  medium: '#d97706',
  low: '#059669',
};

function formatTime(date) {
  if (!date) return '??:??';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventPeople(event) {
  switch (event.type) {
    case 'checkin': return event.personName;
    case 'message': return `${event.senderName} → ${event.recipientName}`;
    case 'sighting': return event.personName + (event.seenWith ? ` w/ ${event.seenWith}` : '');
    case 'note': return event.authorName;
    case 'tip': return event.suspectName;
    default: return '';
  }
}

function stripBrackets(str) {
  return (str || '').replace(/\[.*?\]/g, '').trim();
}

function getEventContent(event) {
  switch (event.type) {
    case 'checkin': return stripBrackets(event.note);
    case 'message': return stripBrackets(event.text);
    case 'sighting': return stripBrackets(event.note);
    case 'note': return stripBrackets(event.note);
    case 'tip': return stripBrackets(event.tip);
    default: return '';
  }
}

function NameLink({ name, onPersonClick }) {
  if (!name) return null;
  if (BLACKLIST.has(normalizeName(name))) return <span>{name}</span>;
  return (
    <button className="name-link" onClick={(e) => { e.stopPropagation(); onPersonClick(getPersonKey(name)); }}>
      {name}
    </button>
  );
}

function renderEventPeople(event, onPersonClick) {
  switch (event.type) {
    case 'checkin': return <NameLink name={event.personName} onPersonClick={onPersonClick} />;
    case 'message': return <><NameLink name={event.senderName} onPersonClick={onPersonClick} /> → <NameLink name={event.recipientName} onPersonClick={onPersonClick} /></>;
    case 'sighting': return <><NameLink name={event.personName} onPersonClick={onPersonClick} />{event.seenWith ? <> w/ <NameLink name={event.seenWith} onPersonClick={onPersonClick} /></> : null}</>;
    case 'note': return <NameLink name={event.authorName} onPersonClick={onPersonClick} />;
    case 'tip': return <NameLink name={event.suspectName} onPersonClick={onPersonClick} />;
    default: return null;
  }
}

function TimelineEvent({ event, onPersonClick }) {
  const config = TYPE_CONFIG[event.type] || { label: event.type.toUpperCase(), color: '#6b7280' };
  const urgencyColor = event.urgency ? URGENCY_COLORS[event.urgency.toLowerCase()] : null;

  return (
    <div className="timeline-event" style={{ borderLeft: `3px solid ${config.color}` }}>
      <div className="event-header">
        <span className="event-badge" style={{ backgroundColor: config.color }}>
          {config.label}
        </span>
        {urgencyColor && (
          <span className="urgency-badge" style={{ color: urgencyColor }}>
            ● {event.urgency?.toUpperCase()}
          </span>
        )}
        <span className="event-time">{formatTime(event.timestamp)}</span>
        <span className="event-location">{event.location}</span>
      </div>
      <div className="event-people">{renderEventPeople(event, onPersonClick)}</div>
      {getEventContent(event) && (
        <div className="event-content">"{getEventContent(event)}"</div>
      )}
    </div>
  );
}

export function Timeline({ data, searchQuery, onPersonClick }) {
  const events = useMemo(() => {
    const all = [
      ...data.checkins,
      ...data.messages,
      ...data.sightings,
      ...data.notes,
      ...data.tips,
    ];

    const sorted = all.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp - b.timestamp;
    });

    if (!searchQuery) return sorted;

    const q = normalizeName(searchQuery);
    return sorted.filter((e) => {
      const people = normalizeName(getEventPeople(e));
      const content = normalizeName(getEventContent(e));
      const location = normalizeName(e.location || '');
      return people.includes(q) || content.includes(q) || location.includes(q);
    });
  }, [data, searchQuery]);

  if (events.length === 0) {
    return <div className="empty-state">No events found.</div>;
  }

  return (
    <div className="timeline">
      <div className="timeline-count">{events.length} events</div>
      {events.map((event) => (
        <TimelineEvent key={`${event.type}-${event.id}`} event={event} onPersonClick={onPersonClick} />
      ))}
    </div>
  );
}
