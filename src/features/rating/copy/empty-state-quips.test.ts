import { EMPTY_STATE_QUIPS, pickRandomQuip } from './empty-state-quips';

describe('empty state quips', () => {
  it('contains exactly 50 quips', () => {
    expect(EMPTY_STATE_QUIPS).toHaveLength(50);
  });

  it('returns a member of the quip list', () => {
    for (let index = 0; index < 20; index += 1) {
      expect(EMPTY_STATE_QUIPS).toContain(pickRandomQuip());
    }
  });
});
