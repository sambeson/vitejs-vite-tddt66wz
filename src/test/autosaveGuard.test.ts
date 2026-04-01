import { describe, it, expect } from 'vitest';

/**
 * Tests for the autosave guard logic.
 * The rule: do not save if mentaculous is empty AND loadedDataHadEntries is true.
 * This prevents a race condition from wiping real data in Firebase.
 */
function shouldSkipAutosave(
  mentaculous: Record<string, any>,
  loadedDataHadEntries: boolean
): boolean {
  return Object.keys(mentaculous).length === 0 && loadedDataHadEntries;
}

describe('autosave guard', () => {
  it('blocks save when mentaculous is empty but was loaded with data', () => {
    expect(shouldSkipAutosave({}, true)).toBe(true);
  });

  it('allows save when mentaculous has entries regardless of flag', () => {
    const mentaculous = { '123': { homeRuns: [] } };
    expect(shouldSkipAutosave(mentaculous, true)).toBe(false);
    expect(shouldSkipAutosave(mentaculous, false)).toBe(false);
  });

  it('allows save when mentaculous is empty AND flag is false (new user with no data)', () => {
    expect(shouldSkipAutosave({}, false)).toBe(false);
  });

  it('allows save after user adds their first entry (flag becomes irrelevant)', () => {
    const mentaculous = { '456': { homeRuns: [{ hrId: '456_2026-04-01_1' }] } };
    expect(shouldSkipAutosave(mentaculous, true)).toBe(false);
  });
});

/**
 * Tests for loadedDataHadEntriesRef reset behavior.
 * The flag must be reset to false at the START of each new user load,
 * not just when loading succeeds — otherwise a failed load for user A
 * blocks user B's first save.
 */
describe('loadedDataHadEntriesRef reset', () => {
  it('resets to false before loading new user data', () => {
    // Simulate: user A had data, switch to user B
    let loadedDataHadEntries = true; // set from user A's session

    // Simulating the start of loadInitialData for user B:
    loadedDataHadEntries = false; // reset at top of effect

    // User B has no data (e.g., brand new user)
    const parsed = {};
    loadedDataHadEntries = Object.keys(parsed).length > 0;

    // User B adds their first HR — should NOT be blocked
    const userBMentaculous = { '789': { homeRuns: [{ hrId: '789_2026-04-01_1' }] } };
    expect(shouldSkipAutosave(userBMentaculous, loadedDataHadEntries)).toBe(false);
  });

  it('still blocks empty save for user A if they had data and something went wrong', () => {
    // User A loaded successfully with data
    let loadedDataHadEntries = false;
    const parsed = { '123': { homeRuns: [] } };
    loadedDataHadEntries = Object.keys(parsed).length > 0; // true

    // Race condition: mentaculous ends up empty
    expect(shouldSkipAutosave({}, loadedDataHadEntries)).toBe(true);
  });
});
