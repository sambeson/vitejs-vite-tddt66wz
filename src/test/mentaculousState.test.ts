import { describe, it, expect } from 'vitest';

// Mirror of the handleRemoveHomeRun logic (extracted from App.tsx for testing)
function removeHomeRun(
  mentaculous: Record<string, any>,
  order: string[],
  playerId: string,
  hrId: string
): { mentaculous: Record<string, any>; order: string[] } {
  const prevPlayer = mentaculous[playerId];
  if (!prevPlayer) return { mentaculous, order };

  const newHomeRuns = prevPlayer.homeRuns.filter((hr: any) => hr.hrId !== hrId);

  if (newHomeRuns.length === 0) {
    const newMentaculous = { ...mentaculous };
    delete newMentaculous[playerId];
    return { mentaculous: newMentaculous, order: order.filter(id => id !== playerId) };
  }

  return {
    mentaculous: { ...mentaculous, [playerId]: { ...prevPlayer, homeRuns: newHomeRuns } },
    order,
  };
}

// Mirror of addHomeRun logic
function addHomeRun(
  mentaculous: Record<string, any>,
  order: string[],
  playerId: string,
  playerData: any,
  hr: any
): { mentaculous: Record<string, any>; order: string[] } {
  const strId = String(playerId);
  const existingPlayer = mentaculous[strId];

  // Duplicate check
  if (existingPlayer?.homeRuns?.some((existing: any) => existing.hrId === hr.hrId)) {
    return { mentaculous, order };
  }

  const updatedPlayer = existingPlayer
    ? { ...existingPlayer, homeRuns: [...existingPlayer.homeRuns, hr] }
    : { ...playerData, homeRuns: [hr], addedAt: Date.now() };

  const newOrder = existingPlayer ? order : [...order, strId];

  return {
    mentaculous: { ...mentaculous, [strId]: updatedPlayer },
    order: newOrder,
  };
}

describe('handleRemoveHomeRun', () => {
  const baseState = {
    mentaculous: {
      '123': {
        homeRuns: [
          { hrId: '123_2026-04-01_5' },
          { hrId: '123_2026-04-02_6' },
        ],
      },
    },
    order: ['123'],
  };

  it('removes a single HR while keeping the player', () => {
    const { mentaculous, order } = removeHomeRun(
      baseState.mentaculous, baseState.order, '123', '123_2026-04-01_5'
    );
    expect(mentaculous['123'].homeRuns).toHaveLength(1);
    expect(mentaculous['123'].homeRuns[0].hrId).toBe('123_2026-04-02_6');
    expect(order).toContain('123');
  });

  it('removes player from both mentaculous and order when last HR is removed', () => {
    const state = {
      mentaculous: { '123': { homeRuns: [{ hrId: '123_2026-04-01_5' }] } },
      order: ['123', '456'],
    };
    const { mentaculous, order } = removeHomeRun(
      state.mentaculous, state.order, '123', '123_2026-04-01_5'
    );
    expect(mentaculous['123']).toBeUndefined();
    expect(order).not.toContain('123');
    expect(order).toContain('456');
  });

  it('is a no-op when player does not exist', () => {
    const { mentaculous, order } = removeHomeRun(
      baseState.mentaculous, baseState.order, '999', 'some-hr-id'
    );
    expect(mentaculous).toEqual(baseState.mentaculous);
    expect(order).toEqual(baseState.order);
  });

  it('does not mutate the original mentaculous object', () => {
    const original = { '123': { homeRuns: [{ hrId: '123_2026-04-01_5' }] } };
    removeHomeRun(original, ['123'], '123', '123_2026-04-01_5');
    expect(original['123']).toBeDefined(); // original unchanged
  });
});

describe('handleAddToMentaculous', () => {
  it('adds a new player and HR correctly', () => {
    const { mentaculous, order } = addHomeRun(
      {}, [], 123, { name: 'Test Player' }, { hrId: '123_2026-04-01_1' }
    );
    expect(mentaculous['123'].homeRuns).toHaveLength(1);
    expect(order).toContain('123');
  });

  it('appends HR to existing player without duplicating player in order', () => {
    const existing = {
      mentaculous: { '123': { homeRuns: [{ hrId: '123_2026-04-01_1' }], addedAt: 1000 } },
      order: ['123'],
    };
    const { mentaculous, order } = addHomeRun(
      existing.mentaculous, existing.order, 123, {}, { hrId: '123_2026-04-02_2' }
    );
    expect(mentaculous['123'].homeRuns).toHaveLength(2);
    expect(order.filter(id => id === '123')).toHaveLength(1); // only once in order
  });

  it('prevents duplicate HRs (same hrId added twice)', () => {
    const hr = { hrId: '123_2026-04-01_1' };
    const state1 = addHomeRun({}, [], 123, {}, hr);
    const state2 = addHomeRun(state1.mentaculous, state1.order, 123, {}, hr);
    expect(state2.mentaculous['123'].homeRuns).toHaveLength(1);
    expect(state2.order.filter(id => id === '123')).toHaveLength(1);
  });
});

describe('timestamp comparison for load priority', () => {
  function pickData(
    fbData: Record<string, any> | null,
    fbUpdatedAt: string | null,
    lsData: Record<string, any>,
    lsUpdatedAt: string | null
  ): Record<string, any> {
    const lsIsNewer = lsUpdatedAt && fbUpdatedAt && lsUpdatedAt > fbUpdatedAt;

    if (fbData && Object.keys(fbData).length && !lsIsNewer) return fbData;
    if (Object.keys(lsData).length) return lsData;
    if (fbData && Object.keys(fbData).length) return fbData;
    return {};
  }

  it('uses Firebase data when it is newer', () => {
    const fbData = { '123': { homeRuns: [] } };
    const lsData = { '456': { homeRuns: [] } };
    const result = pickData(fbData, '2026-04-02T00:00:00Z', lsData, '2026-04-01T00:00:00Z');
    expect(result).toEqual(fbData);
  });

  it('uses localStorage data when it is newer than Firebase', () => {
    const fbData = { '123': { homeRuns: [] } };
    const lsData = { '456': { homeRuns: [] } };
    const result = pickData(fbData, '2026-04-01T00:00:00Z', lsData, '2026-04-02T00:00:00Z');
    expect(result).toEqual(lsData);
  });

  it('falls back to Firebase when localStorage is empty', () => {
    const fbData = { '123': { homeRuns: [] } };
    const result = pickData(fbData, '2026-04-01T00:00:00Z', {}, null);
    expect(result).toEqual(fbData);
  });

  it('returns empty object when both sources are empty', () => {
    const result = pickData({}, null, {}, null);
    expect(result).toEqual({});
  });

  it('returns empty object when Firebase returns null', () => {
    const result = pickData(null, null, {}, null);
    expect(result).toEqual({});
  });
});
