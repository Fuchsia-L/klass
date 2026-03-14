import { ThemeName } from '../../../theme';
import { loadSemesterConfig, saveSemesterConfig } from '../../schedule';
import { SemesterConfig } from '../../schedule/types';

export type SettingsPayload = {
  themeName: ThemeName;
  semester: SemesterConfig | null;
};

export async function loadSettings(): Promise<SettingsPayload> {
  return {
    themeName: 'cyber',
    semester: await loadSemesterConfig(),
  };
}

export async function saveSemesterSettings(config: SemesterConfig): Promise<void> {
  await saveSemesterConfig(config);
}
