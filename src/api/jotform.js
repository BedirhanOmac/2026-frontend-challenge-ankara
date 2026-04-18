const API_KEY = 'ad39735f1449a6dc28d60e0921352665';
const BASE = 'https://api.jotform.com';

const FORMS = {
  checkins: '261065067494966',
  messages: '261065765723966',
  sightings: '261065244786967',
  notes: '261065509008958',
  tips: '261065875889981',
};

// Fuzzy person key: first word of normalized name
// "Kağan", "Kagan", "Kağan A." → all become "kagan"
export function getPersonKey(name) {
  const n = normalizeName(name);
  return n ? n.split(/\s+/)[0] : '';
}

// Remove diacritics for name comparison (Kağan == Kagan)
export function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .trim()
    .toLowerCase();
}

// Parse "18-04-2026 19:05" → Date object
function parseTimestamp(ts) {
  if (!ts) return null;
  const match = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
}

// Extract answer value from a field object (handles string or {name, answer} shape)
function extractAnswer(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    // 'answer' key may be absent on un-filled optional fields — do NOT fall back to field.name
    if ('answer' in field) return field.answer ?? '';
    // Some fields return {first, last} for full names
    if (field.first !== undefined) return `${field.first} ${field.last || ''}`.trim();
  }
  return '';
}

// Flatten the {2: {name, answer}, 3: {...}} answers map into a {fieldName: value} object
function flattenAnswers(answers) {
  const result = {};
  if (!answers) return result;
  for (const key of Object.keys(answers)) {
    const field = answers[key];
    if (field && field.name) {
      result[field.name] = extractAnswer(field);
    }
  }
  return result;
}

async function fetchSubmissions(formId) {
  const url = `${BASE}/form/${formId}/submissions?apiKey=${API_KEY}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for form ${formId}`);
  const json = await res.json();
  if (json.responseCode !== 200) {
    throw new Error(`API error ${json.responseCode}: ${json.message} (form ${formId})`);
  }
  return json.content || [];
}

async function fetchCheckins() {
  const submissions = await fetchSubmissions(FORMS.checkins);
  return submissions.map((s) => {
    const a = flattenAnswers(s.answers);
    const ts = parseTimestamp(a.timestamp);
    return {
      id: s.id,
      type: 'checkin',
      personName: a.personName || a.person_name || '',
      timestamp: ts,
      rawTimestamp: a.timestamp || '',
      location: a.location || '',
      coordinates: a.coordinates || '',
      note: a.note || '',
    };
  });
}

async function fetchMessages() {
  const submissions = await fetchSubmissions(FORMS.messages);
  return submissions.map((s) => {
    const a = flattenAnswers(s.answers);
    const ts = parseTimestamp(a.timestamp);
    return {
      id: s.id,
      type: 'message',
      senderName: a.senderName || a.sender_name || '',
      recipientName: a.recipientName || a.recipient_name || '',
      timestamp: ts,
      rawTimestamp: a.timestamp || '',
      location: a.location || '',
      coordinates: a.coordinates || '',
      text: a.text || '',
      urgency: a.urgency || '',
    };
  });
}

async function fetchSightings() {
  const submissions = await fetchSubmissions(FORMS.sightings);
  return submissions.map((s) => {
    const a = flattenAnswers(s.answers);
    const ts = parseTimestamp(a.timestamp);
    return {
      id: s.id,
      type: 'sighting',
      personName: a.personName || a.person_name || '',
      seenWith: a.seenWith || a.seen_with || '',
      timestamp: ts,
      rawTimestamp: a.timestamp || '',
      location: a.location || '',
      coordinates: a.coordinates || '',
      note: a.note || '',
    };
  });
}

async function fetchNotes() {
  const submissions = await fetchSubmissions(FORMS.notes);
  return submissions.map((s) => {
    const a = flattenAnswers(s.answers);
    const ts = parseTimestamp(a.timestamp);
    return {
      id: s.id,
      type: 'note',
      authorName: a.authorName || a.author_name || '',
      timestamp: ts,
      rawTimestamp: a.timestamp || '',
      location: a.location || '',
      coordinates: a.coordinates || '',
      note: a.note || '',
      mentionedPeople: a.mentionedPeople || a.mentioned_people || '',
    };
  });
}

async function fetchTips() {
  const submissions = await fetchSubmissions(FORMS.tips);
  return submissions.map((s) => {
    const a = flattenAnswers(s.answers);
    const ts = parseTimestamp(a.timestamp);
    return {
      id: s.id,
      type: 'tip',
      suspectName: a.suspectName || a.suspect_name || '',
      timestamp: ts,
      rawTimestamp: a.timestamp || '',
      location: a.location || '',
      coordinates: a.coordinates || '',
      tip: a.tip || '',
      confidence: a.confidence || '',
    };
  });
}

export async function fetchAllData() {
  const [checkins, messages, sightings, notes, tips] = await Promise.all([
    fetchCheckins(),
    fetchMessages(),
    fetchSightings(),
    fetchNotes(),
    fetchTips(),
  ]);
  return { checkins, messages, sightings, notes, tips };
}
