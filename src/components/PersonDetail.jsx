import React, { useMemo } from 'react';
import { getPersonKey } from '../api/jotform';

const TYPE_CONFIG = {
  checkin: { label: 'CHECK-IN', color: '#0a1551' },
  message: { label: 'MESSAGE', color: '#7c3aed' },
  sighting: { label: 'SIGHTING', color: '#ff6100' },
  note: { label: 'NOTE', color: '#059669' },
  tip: { label: 'TIP', color: '#e02020' },
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

function RecordCard({ record }) {
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
        <div className="record-body">{record.note}</div>
      )}
      {record.type === 'message' && (
        <div className="record-body">
          <span className="dim">{record.senderName} → {record.recipientName}</span>
          <br />"{record.text}"
          {record.urgency && <span className="urgency-inline"> [{record.urgency}]</span>}
        </div>
      )}
      {record.type === 'sighting' && (
        <div className="record-body">
          {record.seenWith && <span className="dim">Seen with: {record.seenWith}<br /></span>}
          {record.note}
        </div>
      )}
      {record.type === 'note' && (
        <div className="record-body">
          {record.note}
          {record.mentionedPeople && (
            <div className="dim">Mentions: {record.mentionedPeople}</div>
          )}
        </div>
      )}
      {record.type === 'tip' && (
        <div className="record-body">
          {record.tip}
          {record.confidence && <span className="dim"> [confidence: {record.confidence}]</span>}
        </div>
      )}
    </div>
  );
}

export function PersonDetail({ data, personKey, onClose }) {
  const records = useMemo(
    () => getPersonRecords(data, personKey),
    [data, personKey]
  );

  // Find display name from first record
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
        <RecordCard key={`${r.type}-${r.id}-${r._role}`} record={r} />
      ))}
    </div>
  );
}
