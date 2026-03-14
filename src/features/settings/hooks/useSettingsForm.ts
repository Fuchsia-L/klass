import { useEffect, useState } from 'react';
import { useThemeSettings } from '../../../theme/ThemeContext';
import { SemesterConfig } from '../../schedule/types';
import { loadSettings, saveSemesterSettings, clearAllData } from '../services/settings.service';
import { DEFAULT_THEME } from '../../../theme';

type FormState = {
  semesterStart: string;
  totalWeeks: string;
};

function toFormState(semester: SemesterConfig | null): FormState {
  return {
    semesterStart: semester?.start_date?.slice(0, 10) ?? '',
    totalWeeks: semester ? String(semester.total_weeks) : '',
  };
}

export function useSettingsForm() {
  const { themeName, setThemeName } = useThemeSettings();
  const [form, setForm] = useState<FormState>(() => toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    loadSettings().then((settings) => {
      if (!active) return;
      setForm(toFormState(settings.semester));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const save = async () => {
    const trimmedStart = form.semesterStart.trim();
    const trimmedWeeks = form.totalWeeks.trim();
    const totalWeeks = Number(trimmedWeeks);

    if (!trimmedStart) {
      setMessage('请输入学期开始日期');
      return false;
    }

    if (Number.isNaN(new Date(trimmedStart).getTime())) {
      setMessage('学期开始日期格式应为 YYYY-MM-DD');
      return false;
    }

    if (!Number.isInteger(totalWeeks) || totalWeeks <= 0 || totalWeeks > 30) {
      setMessage('总周数需为 1 到 30 的整数');
      return false;
    }

    setSaving(true);
    await saveSemesterSettings({
      start_date: new Date(trimmedStart).toISOString(),
      total_weeks: totalWeeks,
    });
    setSaving(false);
    setMessage('设置已保存');
    return true;
  };

  const resetAll = async () => {
    await clearAllData();
    setForm(toFormState(null));
    setThemeName(DEFAULT_THEME);
    setMessage('所有数据已清除');
  };

  return {
    form,
    loading,
    saving,
    message,
    themeName,
    updateField,
    save,
    setThemeName,
    resetAll,
  };
}
