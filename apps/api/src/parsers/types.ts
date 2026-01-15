export type CanonicalRows = {
  dailyWeights: Array<{ date: Date; weightKg: number }>;
  dailyNutrition: Array<{
    date: Date;
    calories?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatG?: number | null;
    fibreG?: number | null;
    alcoholG?: number | null;
  }>;
  workouts: Array<{
    start: Date;
    type: string;
    durationMin: number;
    distanceKm?: number | null;
    avgHr?: number | null;
    maxHr?: number | null;
    avgPace?: number | null;
    sourceId?: string | null;
  }>;
  sleepSessions: Array<{
    start: Date;
    end: Date;
    durationMin: number;
    quality?: string | null;
    dedupeKey?: string | null;
  }>;
  dailyVitals: Array<{
    date: Date;
    restingHr?: number | null;
    hrv?: number | null;
  }>;
};

export type ParserResult = {
  rows: CanonicalRows;
  warnings: string[];
};

export type IngestParser = (payload: unknown) => ParserResult;
