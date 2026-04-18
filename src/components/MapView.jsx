import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function popupHTML(event) {
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

  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;min-width:180px;max-width:240px;line-height:1.5">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;letter-spacing:.4px">${label.toUpperCase()}</span>
        <span style="color:#545e94;font-size:11px">${formatTime(event.timestamp)}</span>
      </div>
      <div style="font-weight:700;color:#0a1551;margin-bottom:2px">${people}</div>
      <div style="color:#ff6100;font-size:11px;font-weight:600;margin-bottom:4px">📍 ${event.location || ''}</div>
      ${body ? `<div style="color:#545e94;font-style:italic">"${body}"</div>` : ''}
    </div>
  `;
}

export function MapView({ data }) {
  const containerRef = useRef(null);

  const allEvents = useMemo(() => [
    ...data.checkins,
    ...data.messages,
    ...data.sightings,
    ...data.notes,
    ...data.tips,
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

    // Draw Podo's route first so markers sit on top
    if (podoRoute.length > 1) {
      L.polyline(podoRoute, {
        color: '#ff6100',
        weight: 3,
        opacity: 0.75,
        dashArray: '8, 5',
      }).addTo(map);

      // Start and end markers for the route
      L.marker(podoRoute[0], { icon: makeIcon('#059669', 18) })
        .addTo(map)
        .bindPopup('<b>Route start</b>');
      L.marker(podoRoute[podoRoute.length - 1], { icon: makeIcon('#e02020', 18) })
        .addTo(map)
        .bindPopup('<b>Last known location</b>');
    }

    // Add all event markers
    allEvents.forEach((e) => {
      const coords = parseCoords(e.coordinates);
      const color = TYPE_COLORS[e.type] || '#6b7280';
      L.marker(coords, { icon: makeIcon(color) })
        .addTo(map)
        .bindPopup(popupHTML(e), { maxWidth: 260 });
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
