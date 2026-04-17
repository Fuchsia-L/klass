export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface TimeSlotRating {
  id: string;
  slot_start: string;
  slot_end: string;
  linked_event_id?: string;
  rating: RatingValue;
  efficiency: RatingValue;
  mood?: string;
  activity?: string;
  reflection?: string;
  created_at: string;
  updated_at: string;
  synced_at?: string | null;
  schema_version: 1;
}
