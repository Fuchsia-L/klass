import { getTheme } from '../../theme';
import { getCategoryColor } from './categoryColors';
import { CATEGORIES } from './types';

describe('getCategoryColor', () => {
  it('prefers theme category colors when present', () => {
    const hanami = getTheme('hanami');

    expect(getCategoryColor(hanami, '学习')).toBe(hanami.categoryColors?.学习);
    expect(getCategoryColor(hanami, '娱乐')).toBe(hanami.categoryColors?.娱乐);
  });

  it('falls back to default category colors for legacy themes', () => {
    const cyber = getTheme('cyber');

    expect(getCategoryColor(cyber, '学习')).toBe(CATEGORIES['学习'].color);
    expect(getCategoryColor(cyber, '工作')).toBe(CATEGORIES['工作'].color);
  });
});
