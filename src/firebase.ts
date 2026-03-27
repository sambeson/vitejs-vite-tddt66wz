const PROJECT_ID = 'mentaculous-3ff17';
const API_KEY = 'AIzaSyBFxX5lb0SJXKIV78VQNVX664z3DoGhrRY';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/mentaculous_2026`;

export async function fetchFromFirebase(userId: string): Promise<{ mentaculous: Record<string, any> | null; mentorder: string[] | null; updatedAt: string | null }> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}`);
  if (!res.ok) return { mentaculous: null, mentorder: null, updatedAt: null };

  const data = await res.json();
  const fields = data.fields || {};

  let mentaculous: any = null;
  let mentorder: any = null;
  let updatedAt: string | null = null;

  if (fields.mentaculous?.stringValue) {
    try { mentaculous = JSON.parse(fields.mentaculous.stringValue); } catch { mentaculous = {}; }
  }
  if (fields.mentorder?.stringValue) {
    try { mentorder = JSON.parse(fields.mentorder.stringValue); } catch { mentorder = []; }
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
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firebase save failed: ${res.status}`);
}
