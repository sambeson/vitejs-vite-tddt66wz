const PROJECT_ID = 'mentaculous-3ff17';
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents/mentaculous_2026`;
const STEAL_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents/stealaculous_2026`;

export async function fetchFromFirebase(userId: string): Promise<{ mentaculous: Record<string, any> | null; mentorder: string[] | null; updatedAt: string | null }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}`);
  if (!res.ok) return { mentaculous: null, mentorder: null, updatedAt: null };

  const data = await res.json();
  const fields = data.fields || {};

  let mentaculous: any = null;
  let mentorder: any = null;
  let updatedAt: string | null = null;

  if (fields.mentaculous?.stringValue) {
    try { mentaculous = JSON.parse(fields.mentaculous.stringValue); } catch (e) { console.error('Firebase: failed to parse mentaculous JSON', e); mentaculous = {}; }
  }
  if (fields.mentorder?.stringValue) {
    try { mentorder = JSON.parse(fields.mentorder.stringValue); } catch (e) { console.error('Firebase: failed to parse mentorder JSON', e); mentorder = []; }
  }
  if (fields.updatedAt?.stringValue) {
    updatedAt = fields.updatedAt.stringValue;
  }

  return { mentaculous: mentaculous || {}, mentorder: mentorder || [], updatedAt };
}

export async function saveToFirebase(userId: string, mentaculousData: Record<string, any>, orderData: string[]): Promise<void> {
  const now = new Date().toISOString();
  const body = {
    fields: {
      mentaculous: { stringValue: JSON.stringify(mentaculousData) },
      mentorder: { stringValue: JSON.stringify(orderData) },
      updatedAt: { stringValue: now },
    },
  };
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(userId)}?key=${API_KEY}&updateMask.fieldPaths=mentaculous&updateMask.fieldPaths=mentorder&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Firebase save failed: ${res.status}`);
}

export async function fetchStealaculousFromFirebase(userId: string): Promise<{ stealaculous: Record<string, any> | null; stealorder: string[] | null }> {
  const res = await fetch(`${STEAL_BASE_URL}/${encodeURIComponent(userId)}?key=${API_KEY}`);
  if (!res.ok) return { stealaculous: null, stealorder: null };

  const data = await res.json();
  const fields = data.fields || {};

  let stealaculous: any = null;
  let stealorder: any = null;

  if (fields.stealaculous?.stringValue) {
    try { stealaculous = JSON.parse(fields.stealaculous.stringValue); } catch (e) { console.error('Firebase: failed to parse stealaculous JSON', e); stealaculous = {}; }
  }
  if (fields.stealorder?.stringValue) {
    try { stealorder = JSON.parse(fields.stealorder.stringValue); } catch (e) { console.error('Firebase: failed to parse stealorder JSON', e); stealorder = []; }
  }

  return { stealaculous: stealaculous || {}, stealorder: stealorder || [] };
}

export async function saveStealaculousToFirebase(userId: string, stealaculousData: Record<string, any>, orderData: string[]): Promise<void> {
  const body = {
    fields: {
      stealaculous: { stringValue: JSON.stringify(stealaculousData) },
      stealorder: { stringValue: JSON.stringify(orderData) },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  };
  const res = await fetch(
    `${STEAL_BASE_URL}/${encodeURIComponent(userId)}?key=${API_KEY}&updateMask.fieldPaths=stealaculous&updateMask.fieldPaths=stealorder&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Stealaculous Firebase save failed: ${res.status}`);
}
