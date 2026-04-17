import {
  exportLocalRatingsAsJson,
  serializeRatingRecords,
  shareRatingsJson,
} from './rating-export.service';
import { exportRatings } from '../../rating/services';
import type { TimeSlotRating } from '../../rating/types';

jest.mock('../../rating/services', () => ({
  exportRatings: jest.fn(),
}));

const exportRatingsMock = exportRatings as jest.MockedFunction<typeof exportRatings>;

function buildRating(overrides?: Partial<TimeSlotRating>): TimeSlotRating {
  return {
    id: 'rating-1',
    slot_start: '2026-04-17T01:00:00.000Z',
    slot_end: '2026-04-17T02:00:00.000Z',
    linked_event_id: 'event-1',
    rating: 5,
    efficiency: 4,
    mood: '稳住 ✨',
    activity: '复盘 Phase 5 导出',
    reflection: '长文本 '.repeat(20),
    created_at: '2026-04-17T02:00:00.000Z',
    updated_at: '2026-04-17T02:10:00.000Z',
    synced_at: '2026-04-17T02:11:00.000Z',
    schema_version: 1,
    ...overrides,
  };
}

describe('rating export service', () => {
  it('serializes an empty list as valid JSON []', () => {
    const json = serializeRatingRecords([]);

    expect(json).toBe('[]');
    expect(JSON.parse(json)).toEqual([]);
  });

  it('serializes complete records with optional fields, emoji, and long strings', () => {
    const record = buildRating();
    const json = serializeRatingRecords([record]);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual([record]);
    expect(parsed[0]).toMatchObject({
      rating: 5,
      efficiency: 4,
      schema_version: 1,
      synced_at: '2026-04-17T02:11:00.000Z',
    });
  });

  it('falls back to React Native Share when expo-sharing is unavailable', async () => {
    const share = jest.fn().mockResolvedValue({ action: 'sharedAction' });

    await expect(
      shareRatingsJson('[{"id":"rating-1"}]', {
        expoSharing: null,
        fileSystem: null,
        share,
      }),
    ).resolves.toBe('react-native-share');

    expect(share).toHaveBeenCalledWith({
      title: '导出打分数据',
      message: '[{"id":"rating-1"}]',
    });
  });

  it('uses expo-sharing when it is available with a writable file cache', async () => {
    const share = jest.fn();
    const isAvailableAsync = jest.fn().mockResolvedValue(true);
    const shareAsync = jest.fn().mockResolvedValue(undefined);
    const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      shareRatingsJson('[]', {
        expoSharing: {
          isAvailableAsync,
          shareAsync,
        },
        fileSystem: {
          cacheDirectory: 'file:///cache/',
          EncodingType: {
            UTF8: 'utf8',
          },
          writeAsStringAsync,
        },
        share,
      }),
    ).resolves.toBe('expo-sharing');

    expect(writeAsStringAsync).toHaveBeenCalledWith('file:///cache/cyberschedule-ratings.json', '[]', {
      encoding: 'utf8',
    });
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/cyberschedule-ratings.json', {
      dialogTitle: '导出打分数据',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
    expect(share).not.toHaveBeenCalled();
  });

  it('loads ratings through the rating service export API before sharing JSON', async () => {
    const record = buildRating({ id: 'rating-through-service' });
    const share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
    exportRatingsMock.mockResolvedValue({
      exported_at: '2026-04-17T03:00:00.000Z',
      schema_version: 1,
      ratings: [record],
    });

    const result = await exportLocalRatingsAsJson({
      expoSharing: null,
      fileSystem: null,
      share,
    });

    expect(exportRatingsMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      count: 1,
      json: serializeRatingRecords([record]),
      method: 'react-native-share',
    });
    expect(JSON.parse(result.json)).toEqual([record]);
  });
});
