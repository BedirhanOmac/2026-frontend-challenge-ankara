import React, { useMemo } from 'react';

const TYPE_CONFIG = {
  checkin: { label: 'CHECK-IN', color: '#3b82f6' },
  message: { label: 'MESSAGE', color: '#8b5cf6' },
  sighting: { label: 'SIGHTING', color: '#f59e0b' },
  note: { label: 'NOTE', color: '#10b981' },
  tip: { label: 'TIP', color: '#ef4444' },
};

const URGENCY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
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

function getEventContent(event) {
  switch (event.type) {
    case 'checkin': return event.note;
    case 'message': return event.text;
    case 'sighting': return event.note;
    case 'note': return event.note + (event.mentionedPeople ? ` [mentions: ${event.mentionedPeople}]` : '');
    case 'tip': return event.tip + (event.confidence ? ` [confidence: ${event.confidence}]` : '');
    default: return '';
  }
}

function TimelineEvent({ event }) {
  const config = TYPE_CONFIG[event.type] || { label: event.type.toUpperCase(), color: '#6b7280' };
  const urgencyColor = event.urgency ? URGENCY_COLORS[event.urgency.toLowerCase()] : null;

  return (
    <div className="timeline-event">
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
      <div className="event-people">{getEventPeople(event)}</div>
      {getEventContent(event) && (
        <div className="event-content">"{getEventContent(event)}"</div>
      )}
    </div>
  );
}

export function Timeline({ data, searchQuery }) {
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

    const q = searchQuery.toLowerCase();
    return sorted.filter((e) => {
      const people = getEventPeople(e).toLowerCase();
      const content = getEventContent(e).toLowerCase();
      const location = (e.location || '').toLowerCase();
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
        <TimelineEvent key={`${event.type}-${event.id}`} event={event} />
      ))}
    </div>
  );
}
