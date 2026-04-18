import { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getPersonKey } from '../api/jotform';

const TYPE_COLORS = {
  checkin: '#059669',
  message: '#7c3aed',
  sighting: '#ff6100',
  note: '#3b82f6',
  tip: '#e02020',
};

const TYPE_LABELS = {
  checkin: 'Check-in',
  message: 'Message',
  sighting: 'Sighting',
  note: 'Note',
  tip: 'Anonymous Tip',
};

function parseCoords(str) {
  if (!str) return null;
  const parts = str.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return [parts[0], parts[1]];
}

function makeIcon(color, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 1px 5px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getEventPersonName(event) {
  switch (event.type) {
    case 'checkin':  return event.personName;
    case 'message':  return event.senderName;
    case 'sighting': return event.personName;
    case 'note':     return event.authorName;
    case 'tip':      return event.suspectName;
    default:         return null;
  }
}

function popupHTML(event, popupId) {
  const color = TYPE_COLORS[event.type] || '#6b7280';
  const label = TYPE_LABELS[event.type] || event.type;

  let people = '';
  switch (event.type) {
    case 'checkin':  people = event.personName; break;
    case 'message':  people = `${event.senderName} → ${event.recipientName}`; break;
    case 'sighting': people = event.personName + (event.seenWith ? ` w/ ${event.seenWith}` : ''); break;
    case 'note':     people = event.authorName; break;
    case 'tip':      people = event.suspectName; break;
  }

  const body = (event.note || event.text || event.tip || '').replace(/\[.*?\]/g, '').trim();
  const personName = getEventPersonName(event);

  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;min-width:180px;max-width:240px;line-height:1.5">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;letter-spacing:.4px">${label.toUpperCase()}</span>
        <span style="color:#545e94;font-size:11px">${formatTime(event.timestamp)}</span>
      </div>
      <div style="font-weight:700;color:#0a1551;margin-bottom:2px">${people}</div>
      <div style="color:#ff6100;font-size:11px;font-weight:600;margin-bottom:4px">📍 ${event.location || ''}</div>
      ${body ? `<div style="color:#545e94;font-style:italic;margin-bottom:8px">"${body}"</div>` : '<div style="margin-bottom:8px"></div>'}
      ${personName ? `<button id="${popupId}" style="background:#ff6100;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">View profile →</button>` : ''}
    </div>
  `;
}

export function MapView({ data, onPersonClick }) {
  const containerRef = useRef(null);
  const onPersonClickRef = useRef(onPersonClick);
  useEffect(() => { onPersonClickRef.current = onPersonClick; }, [onPersonClick]);

  // Tips rendered first (bottom layer), checkins last (top layer)
  // so Podo's check-in markers surface on top at shared coordinates
  const allEvents = useMemo(() => [
    ...data.tips,
    ...data.notes,
    ...data.messages,
    ...data.sightings,
    ...data.checkins,
  ].filter((e) => parseCoords(e.coordinates)), [data]);

  // Podo's confirmed locations: checkins + sightings where Podo is the subject
  const podoRoute = useMemo(() => [
    ...data.checkins.filter((e) => e.personName?.toLowerCase() === 'podo'),
    ...data.sightings.filter((e) => e.personName?.toLowerCase() === 'podo'),
  ]
    .filter((e) => parseCoords(e.coordinates) && e.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => parseCoords(e.coordinates)),
  [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.925, 32.855],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Draw Podo's route only when there are 2+ distinct locations
    const distinctRoute = podoRoute.filter(
      (coord, i, arr) => i === 0 || coord[0] !== arr[i - 1][0] || coord[1] !== arr[i - 1][1]
    );
    if (distinctRoute.length > 1) {
      L.polyline(podoRoute, {
        color: '#ff6100',
        weight: 3,
        opacity: 0.75,
        dashArray: '8, 5',
      }).addTo(map);

      // Start and end markers for the route
      L.marker(distinctRoute[0], { icon: makeIcon('#059669', 18) })
        .addTo(map)
        .bindPopup('<b>Route start</b>');
      L.marker(distinctRoute[distinctRoute.length - 1], { icon: makeIcon('#e02020', 18) })
        .addTo(map)
        .bindPopup('<b>Last known location</b>');
    }

    // Add all event markers
    allEvents.forEach((e, i) => {
      const coords = parseCoords(e.coordinates);
      const color = TYPE_COLORS[e.type] || '#6b7280';
      const popupId = `popup-btn-${i}`;
      const personName = getEventPersonName(e);
      const marker = L.marker(coords, { icon: makeIcon(color) })
        .addTo(map)
        .bindPopup(popupHTML(e, popupId), { maxWidth: 260 });

      if (personName) {
        marker.on('popupopen', () => {
          const btn = document.getElementById(popupId);
          if (btn) btn.onclick = () => onPersonClickRef.current?.(getPersonKey(personName));
        });
      }
    });

    // Fit map to all markers if we have data
    if (allEvents.length > 0) {
      const bounds = L.latLngBounds(allEvents.map((e) => parseCoords(e.coordinates)));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => { map.remove(); };
  }, [allEvents, podoRoute]);

  return (
    <div className="map-wrapper">
      <div className="map-legend">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {TYPE_LABELS[type]}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-line" />
          Podo's route
        </span>
      </div>
      <div ref={containerRef} className="map-container" />
    </div>
  );
}
