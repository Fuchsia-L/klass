import { Share } from 'react-native';
import { exportRatings, type RatingsExportData } from '../../rating/services';
import type { TimeSlotRating } from '../../rating/types';

type ExpoSharingModule = {
  isAvailableAsync?: () => Promise<boolean>;
  shareAsync?: (
    url: string,
    options?: {
      mimeType?: string;
      dialogTitle?: string;
      UTI?: string;
    },
  ) => Promise<void>;
};

type ExpoFileSystemModule = {
  cacheDirectory?: string | null;
  EncodingType?: {
    UTF8?: string;
  };
  writeAsStringAsync?: (
    fileUri: string,
    contents: string,
    options?: {
      encoding?: string;
    },
  ) => Promise<void>;
};

export type RatingExportShareAdapters = {
  expoSharing?: ExpoSharingModule | null;
  fileSystem?: ExpoFileSystemModule | null;
  share?: typeof Share.share;
};

export type RatingExportShareMethod = 'expo-sharing' | 'react-native-share';

export type RatingExportResult = {
  count: number;
  json: string;
  method: RatingExportShareMethod;
};

const EXPORT_FILE_NAME = 'cyberschedule-ratings.json';

function loadOptionalModule<T>(moduleName: string): T | null {
  try {
    const optionalRequire = (0, eval)('require') as ((name: string) => T) | undefined;
    if (typeof optionalRequire !== 'function') return null;
    return optionalRequire(moduleName);
  } catch {
    return null;
  }
}

function getDefaultShareAdapters(): Required<Pick<RatingExportShareAdapters, 'share'>> &
  Omit<RatingExportShareAdapters, 'share'> {
  return {
    expoSharing: loadOptionalModule<ExpoSharingModule>('expo-sharing'),
    fileSystem: loadOptionalModule<ExpoFileSystemModule>('expo-file-system'),
    share: Share.share,
  };
}

export function serializeRatingRecords(ratings: readonly TimeSlotRating[]): string {
  return JSON.stringify(ratings, null, 2);
}

export function serializeRatingsExportData(exportData: RatingsExportData): string {
  return serializeRatingRecords(exportData.ratings);
}

async function tryShareWithExpoSharing(
  json: string,
  adapters: RatingExportShareAdapters,
): Promise<boolean> {
  const { expoSharing, fileSystem } = adapters;
  if (!expoSharing?.isAvailableAsync || !expoSharing.shareAsync) return false;
  if (!fileSystem?.cacheDirectory || !fileSystem.writeAsStringAsync) return false;

  const isAvailable = await expoSharing.isAvailableAsync();
  if (!isAvailable) return false;

  const fileUri = `${fileSystem.cacheDirectory}${EXPORT_FILE_NAME}`;
  await fileSystem.writeAsStringAsync(fileUri, json, {
    encoding: fileSystem.EncodingType?.UTF8 ?? 'utf8',
  });
  await expoSharing.shareAsync(fileUri, {
    dialogTitle: '导出打分数据',
    mimeType: 'application/json',
    UTI: 'public.json',
  });

  return true;
}

export async function shareRatingsJson(
  json: string,
  adapters: RatingExportShareAdapters = getDefaultShareAdapters(),
): Promise<RatingExportShareMethod> {
  const didShareWithExpo = await tryShareWithExpoSharing(json, adapters);
  if (didShareWithExpo) return 'expo-sharing';

  const share = adapters.share ?? Share.share;
  await share({
    title: '导出打分数据',
    message: json,
  });
  return 'react-native-share';
}

export async function exportLocalRatingsAsJson(
  adapters?: RatingExportShareAdapters,
): Promise<RatingExportResult> {
  const exportData = await exportRatings();
  const json = serializeRatingsExportData(exportData);
  const method = await shareRatingsJson(json, adapters);

  return {
    count: exportData.ratings.length,
    json,
    method,
  };
}
