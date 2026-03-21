import { addEvent } from './events.service';

describe('events service typing', () => {
  it('keeps addEvent input compatible with repeat_until', () => {
    const eventInput: Parameters<typeof addEvent>[0] = {
      title: 'Weekly Review',
      category: '学习',
      start_time: '2026-03-20T08:00:00.000Z',
      end_time: '2026-03-20T09:00:00.000Z',
      repeat: 'weekly',
      repeat_until: '2026-05-29',
    };

    expect(eventInput.repeat_until).toBe('2026-05-29');
  });
});
