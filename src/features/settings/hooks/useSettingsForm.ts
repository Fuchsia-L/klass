import { useEffect, useState } from 'react';
import { useThemeSettings } from '../../../theme/ThemeContext';
import { ThemeName } from '../../../theme';
import { SemesterConfig } from '../../schedule/types';
import { loadSettings, saveSemesterSettings } from '../services/settings.service';

type FormState = {
  semesterStart: string;
  totalWeeks: string;
  themeName: ThemeName;
};

function toFormState(
  semester: SemesterConfig | null,
  themeName: ThemeName,
): FormState {
  return {
    semesterStart: semester?.start_date?.slice(0, 10) ?? '',
    totalWeeks: semester ? String(semester.total_weeks) : '',
    themeName,
  };
}

export function useSettingsForm() {
  const { themeName, setThemeName } = useThemeSettings();
  const [form, setForm] = useState<FormState>(() => toFormState(null, themeName));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    loadSettings().then((settings) => {
      if (!active) return;
      setForm(toFormState(settings.semester, themeName));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [themeName]);

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
    setThemeName(form.themeName);
    setSaving(false);
    setMessage('设置已保存');
    return true;
  };

  return {
    form,
    loading,
    saving,
    message,
    updateField,
    save,
    setThemeName: (nextTheme: ThemeName) => {
      setForm((current) => ({ ...current, themeName: nextTheme }));
      setMessage('');
    },
  };
}
