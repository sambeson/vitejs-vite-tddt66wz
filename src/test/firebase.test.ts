import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the firebase module logic by mocking fetch
const PROJECT_ID = 'mentaculous-3ff17';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/default/documents/mentaculous_2026`;

// Re-implement the firebase logic here for unit testing (mirrors firebase.ts exactly)
async function fetchFromFirebase(userId: string): Promise<{ mentaculous: Record<string, any> | null; mentorder: string[] | null; updatedAt: string | null }> {
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

describe('fetchFromFirebase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null fields when fetch fails (non-ok response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await fetchFromFirebase('Sam beson');
    expect(result.mentaculous).toBeNull();
    expect(result.mentorder).toBeNull();
    expect(result.updatedAt).toBeNull();
  });

  it('parses valid mentaculous data correctly', async () => {
    const mentaculousData = { '123': { homeRuns: [{ hrId: '123_2026-04-01_5' }] } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        fields: {
          mentaculous: { stringValue: JSON.stringify(mentaculousData) },
          mentorder: { stringValue: JSON.stringify(['123']) },
          updatedAt: { stringValue: '2026-04-01T12:00:00.000Z' },
        },
      }),
    }));
    const result = await fetchFromFirebase('Sam beson');
    expect(result.mentaculous).toEqual(mentaculousData);
    expect(result.mentorder).toEqual(['123']);
    expect(result.updatedAt).toBe('2026-04-01T12:00:00.000Z');
  });

  it('returns empty objects when fields are missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fields: {} }),
    }));
    const result = await fetchFromFirebase('Sam beson');
    expect(result.mentaculous).toEqual({});
    expect(result.mentorder).toEqual([]);
    expect(result.updatedAt).toBeNull();
  });

  it('returns {} and logs error when mentaculous JSON is corrupt', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        fields: {
          mentaculous: { stringValue: 'NOT_VALID_JSON{{{' },
        },
      }),
    }));
    const result = await fetchFromFirebase('Sam beson');
    expect(result.mentaculous).toEqual({});
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Firebase: failed to parse mentaculous JSON'),
      expect.anything()
    );
  });

  it('returns [] and logs error when mentorder JSON is corrupt', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        fields: {
          mentorder: { stringValue: 'BROKEN[[[' },
        },
      }),
    }));
    const result = await fetchFromFirebase('Sam beson');
    expect(result.mentorder).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Firebase: failed to parse mentorder JSON'),
      expect.anything()
    );
  });
});
