import { getAllThemes, getTheme, THEME_OPTIONS } from './index';

describe('theme registry', () => {
  it('exposes legacy themes plus the Minimal palette set', () => {
    expect(Object.keys(getAllThemes())).toHaveLength(10);
    expect(THEME_OPTIONS).toHaveLength(10);
    expect(THEME_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'hanami', label: 'Sakura 桜' }),
        expect.objectContaining({ name: 'ocean', label: 'Ocean' }),
        expect.objectContaining({ name: 'minimal-black', label: 'Minimal Black' }),
        expect.objectContaining({ name: 'minimal-ghost', label: 'Minimal Ghost' }),
      ]),
    );

    expect(getTheme('hanami')).toMatchObject({ id: 'hanami', name: 'Sakura 桜' });
    expect(getTheme('ocean')).toMatchObject({ id: 'ocean', name: 'Ocean' });
    expect(getTheme('minimal-ink')).toMatchObject({ id: 'minimal-ink' });
  });

  it('keeps legacy themes working without optional tokens', () => {
    const cyber = getTheme('cyber');

    expect(cyber.id).toBe('cyber');
    expect(cyber.colors.warning).toBeUndefined();
    expect(cyber.categoryColors).toBeUndefined();
  });
});
