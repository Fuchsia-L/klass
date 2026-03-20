import { getAllThemes, getTheme, THEME_OPTIONS } from './index';

describe('theme registry', () => {
  it('exposes six themes including hanami and ocean', () => {
    expect(Object.keys(getAllThemes())).toHaveLength(6);
    expect(THEME_OPTIONS).toHaveLength(6);
    expect(THEME_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'hanami', label: 'Sakura 桜' }),
        expect.objectContaining({ name: 'ocean', label: 'Ocean' }),
      ]),
    );

    expect(getTheme('hanami')).toMatchObject({ id: 'hanami', name: 'Sakura 桜' });
    expect(getTheme('ocean')).toMatchObject({ id: 'ocean', name: 'Ocean' });
  });

  it('keeps legacy themes working without optional tokens', () => {
    const cyber = getTheme('cyber');

    expect(cyber.id).toBe('cyber');
    expect(cyber.colors.warning).toBeUndefined();
    expect(cyber.categoryColors).toBeUndefined();
  });
});
