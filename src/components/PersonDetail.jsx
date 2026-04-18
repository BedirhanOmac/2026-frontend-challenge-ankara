import React, { useMemo } from 'react';
import { getPersonKey, normalizeName } from '../api/jotform';

const BLACKLIST = new Set(['unknown', 'event staff', 'bilinmiyor', 'staff', 'anonymous', 'n/a']);

const TYPE_CONFIG = {
  checkin: { label: 'CHECK-IN', color: '#0a1551' },
  message: { label: 'MESSAGE', color: '#7c3aed' },
  sighting: { label: 'SIGHTING', color: '#ff6100' },
  note: { label: 'NOTE', color: '#059669' },
  tip: { label: 'TIP', color: '#e02020' },
};

const CONFIDENCE_COLORS = {
  high: '#e02020',
  medium: '#d97706',
  low: '#9ca3af',
};

function stripBrackets(str) {
  return (str || '').replace(/\[.*?\]/g, '').trim();
}

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

function NameLink({ name, onPersonClick }) {
  if (!name) return null;
  return (
    <button
      className="name-link"
      onClick={(e) => { e.stopPropagation(); onPersonClick(getPersonKey(name.trim())); }}
    >
      {name.trim()}
    </button>
  );
}

function SeenWithLinks({ seenWith, onPersonClick }) {
  const names = seenWith.split(/[,;]/).map((n) => n.trim()).filter(Boolean);
  return (
    <>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          {BLACKLIST.has(normalizeName(n))
            ? <span>{n}</span>
            : <NameLink name={n} onPersonClick={onPersonClick} />}
          {i < names.length - 1 ? ', ' : ''}
        </React.Fragment>
      ))}
    </>
  );
}

function getPersonRecords(data, normalizedKey) {
  const records = [];

  data.checkins.forEach((e) => {
    if (getPersonKey(e.personName) === normalizedKey)
      records.push({ ...e, _role: 'subject' });
  });

  data.messages.forEach((e) => {
    if (getPersonKey(e.senderName) === normalizedKey)
      records.push({ ...e, _role: 'sender' });
    else if (getPersonKey(e.recipientName) === normalizedKey)
      records.push({ ...e, _role: 'recipient' });
  });

  data.sightings.forEach((e) => {
    if (getPersonKey(e.personName) === normalizedKey) {
      records.push({ ...e, _role: 'subject' });
    } else if (
      e.seenWith &&
      e.seenWith.split(/[,;]/).map((n) => getPersonKey(n.trim())).includes(normalizedKey)
    ) {
      records.push({ ...e, _role: 'companion' });
    }
  });

  data.notes.forEach((e) => {
    if (getPersonKey(e.authorName) === normalizedKey) {
      records.push({ ...e, _role: 'author' });
    } else if (
      e.mentionedPeople &&
      e.mentionedPeople.split(/[,;]/).map((n) => getPersonKey(n.trim())).includes(normalizedKey)
    ) {
      records.push({ ...e, _role: 'mentioned' });
    }
  });

  data.tips.forEach((e) => {
    if (getPersonKey(e.suspectName) === normalizedKey)
      records.push({ ...e, _role: 'suspect' });
  });

  return records.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return a.timestamp - b.timestamp;
  });
}

function RecordCard({ record, onPersonClick }) {
  const config = TYPE_CONFIG[record.type] || { label: record.type.toUpperCase(), color: '#6b7280' };

  return (
    <div className="record-card">
      <div className="record-header">
        <span className="event-badge" style={{ backgroundColor: config.color }}>
          {config.label}
        </span>
        <span className="role-tag">as {record._role}</span>
        <span className="event-time">{formatTime(record.timestamp)}</span>
        {record.location && <span className="event-location">{record.location}</span>}
      </div>

      {record.type === 'checkin' && (
        <div className="record-body">{stripBrackets(record.note)}</div>
      )}
      {record.type === 'message' && (
        <div className="record-body">
          <span className="dim">{record.senderName} → {record.recipientName}</span>
          <br />"{stripBrackets(record.text)}"
          {record.urgency && (
            <span className="event-badge" style={{ backgroundColor: CONFIDENCE_COLORS[record.urgency.toLowerCase()] ?? '#9ca3af', marginLeft: 6 }}>
              {record.urgency.toUpperCase()}
            </span>
          )}
        </div>
      )}
      {record.type === 'sighting' && (
        <div className="record-body">
          {record.seenWith && (
            <div className="dim">
              Seen with: <SeenWithLinks seenWith={record.seenWith} onPersonClick={onPersonClick} />
            </div>
          )}
          {stripBrackets(record.note)}
        </div>
      )}
      {record.type === 'note' && (
        <div className="record-body">{stripBrackets(record.note)}</div>
      )}
      {record.type === 'tip' && (
        <div className="record-body">
          {stripBrackets(record.tip)}
          {record.confidence && (
            <span className="event-badge" style={{ backgroundColor: CONFIDENCE_COLORS[record.confidence.toLowerCase()] ?? '#9ca3af', marginLeft: 6 }}>
              {record.confidence.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PersonDetail({ data, personKey, onClose, onPersonClick }) {
  const records = useMemo(
    () => getPersonRecords(data, personKey),
    [data, personKey]
  );

  const displayName = useMemo(() => {
    for (const r of records) {
      if (getPersonKey(r.personName || r.senderName || r.authorName || r.suspectName || '') === personKey) {
        return r.personName || r.senderName || r.authorName || r.suspectName || personKey;
      }
    }
    return personKey;
  }, [records, personKey]);

  return (
    <div className="person-detail">
      <div className="detail-header">
        <div className="detail-name">{displayName}</div>
        <button className="close-btn" onClick={onClose}>✕ CLOSE</button>
      </div>
      <div className="detail-count">{records.length} records linked</div>
      {records.length === 0 && <div className="empty-state">No records found for this person.</div>}
      {records.map((r) => (
        <RecordCard key={`${r.type}-${r.id}-${r._role}`} record={r} onPersonClick={onPersonClick} />
      ))}
    </div>
  );
}
