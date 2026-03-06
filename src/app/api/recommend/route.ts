import { NextRequest, NextResponse } from 'next/server';

import {
  buildPeriodRecommendation,
  PeriodRecommendation,
  DATA_REFERENCE_CATALOG,
  ObservedConditionsInput
} from '@/lib/recommendation';

type TideEvent = {
  type?: string;
  date?: string;
  height?: number;
  time?: string;
};

type HourlyPayload = {
  hourly?: {
    time?: string[];
    [key: string]: string[] | number[] | undefined;
  };
  [key: string]: unknown;
};

type TidePayload = {
  status?: number;
  error?: string;
  extremes?: TideEvent[];
  heights?: { time: string[]; height: number[] };
};

type ForecastSources = {
  tideSuccess: boolean;
  marineSuccess: boolean;
  weatherSuccess: boolean;
};

const OPEN_METEO_MARINE_URL = process.env.OPENMETEO_MARINE_URL ?? 'https://marine-api.open-meteo.com/v1/marine';
const OPEN_METEO_WEATHER_URL = process.env.OPENMETEO_WEATHER_URL ?? 'https://api.open-meteo.com/v1/forecast';
const WORLD_TIDES_API_URL = process.env.WORLD_TIDES_API_URL ?? 'https://www.worldtides.info/api/v3';
const WORLD_TIDES_API_KEY = process.env.WORLD_TIDES_API_KEY ?? '';

const FETCH_TIMEOUT_MS = 5500;

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function clampNum(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getQueryNumber(sp: URLSearchParams, key: string): number | null {
  const raw = sp.get(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimeZone(value: string | null): string {
  if (!value) return 'auto';
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  return encodeURIComponent(decoded);
}

function parseDateString(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return value;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

function nearestIndex(times: string[] | undefined, target: number): number | null {
  if (!times || times.length === 0) return null;

  let bestIndex = 0;
  let bestGap = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const point = Date.parse(times[i]);
    if (!Number.isFinite(point)) continue;
    const gap = Math.abs(point - target);
    if (gap < bestGap) {
      bestGap = gap;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function valueAtTime(payload: HourlyPayload | null, key: string, targetDate: string): number | undefined {
  if (!payload || !payload.hourly) return undefined;
  const times = payload.hourly.time;
  if (!times || times.length === 0) return undefined;

  const targetMinute = targetDate.length >= 16 ? targetDate.slice(0, 16) : targetDate;
  const exactIndex = times.findIndex((item) => item.slice(0, 16) === targetMinute);
  if (exactIndex >= 0) {
    return toNumber(payload.hourly[key]?.[exactIndex]);
  }

  const targetMs = Date.parse(targetDate);
  const idx = nearestIndex(times, targetMs);
  if (idx === null) return undefined;

  return toNumber(payload.hourly[key]?.[idx]);
}

function aggregateTideRangeByDate(tidePayload: TidePayload | null, targetDate: string): {
  range?: number;
  height?: number;
} {
  if (!tidePayload) return {};

  const events = (tidePayload.extremes || []).filter(
    (event) =>
      typeof event.height === 'number' &&
      typeof event.date === 'string' &&
      event.date.includes(targetDate.slice(0, 10))
  );

  if (events.length >= 2) {
    const heights = events.map((e) => e.height as number);
    const values = heights.sort((a, b) => a - b);
    const range = toNumber(values.at(-1)! - values[0]);
    const nearestByDate = events
      .map((event) => ({
        event,
        gap: Math.abs(new Date(event.date as string).getTime() - Date.parse(targetDate))
      }))
      .sort((a, b) => a.gap - b.gap)[0]?.event;

    return {
      range,
      height: toNumber(nearestByDate?.height)
    };
  }

  if (tidePayload.heights && tidePayload.heights.time?.length) {
    const times = tidePayload.heights.time;
    const idx = nearestIndex(times, Date.parse(targetDate));
    if (idx === null) return {};

    const height = toNumber(tidePayload.heights.height?.[idx]);
    const sameDate = (times[idx] || '').slice(0, 10);

    const candidates = (tidePayload.heights.height || [])
      .map((h, i) => ({
        h: toNumber(h),
        t: times[i],
        sameDate
      }))
      .filter((entry) => entry.h !== undefined && typeof entry.t === 'string' && entry.t.slice(0, 10) === sameDate);

    const values = candidates.map((entry) => entry.h!).filter((n) => n !== undefined);
    if (values.length >= 2) {
      const sorted = values.slice().sort((a, b) => a - b);
      return {
        range: sorted.at(-1)! - sorted[0],
        height
      };
    }

    return { height };
  }

  return {};
}

async function fetchProviderStates(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  timezoneParam: string
) {
  const weatherUrl = `${OPEN_METEO_WEATHER_URL}?latitude=${encodeURIComponent(
    String(latitude)
  )}&longitude=${encodeURIComponent(String(longitude))}&hourly=wind_speed_10m,precipitation&timezone=${timezoneParam}&start_date=${startDate}&end_date=${endDate}&timeformat=iso8601&wind_speed_unit=ms`;

  const marineUrl = `${OPEN_METEO_MARINE_URL}?latitude=${encodeURIComponent(
    String(latitude)
  )}&longitude=${encodeURIComponent(String(longitude))}&hourly=wave_height,current_speed,sea_surface_temperature,swell_wave_height&timezone=${timezoneParam}&start_date=${startDate}&end_date=${endDate}&timeformat=iso8601`;

  const worldTidesUrl = WORLD_TIDES_API_KEY
    ? `${WORLD_TIDES_API_URL}?extremes=1&datum=MSL&datumType=msl&lat=${encodeURIComponent(
        String(latitude)
      )}&lon=${encodeURIComponent(String(longitude))}&start=${Math.floor(new Date(`${startDate}T00:00:00`).getTime() / 1000)}&end=${Math.floor(
        new Date(`${endDate}T23:59:59`).getTime() / 1000
      )}&key=${encodeURIComponent(WORLD_TIDES_API_KEY)}`
    : null;

  const result: {
    weather: HourlyPayload | null;
    marine: HourlyPayload | null;
    tide: TidePayload | null;
    sources: ForecastSources;
    sourceNotes: string[];
  } = {
    weather: null,
    marine: null,
    tide: null,
    sources: {
      tideSuccess: false,
      marineSuccess: false,
      weatherSuccess: false
    },
    sourceNotes: []
  };

  const tasks = [
    fetchJsonWithTimeout<HourlyPayload>(weatherUrl).then((payload) => {
      result.weather = payload;
      result.sources.weatherSuccess = true;
    }),
    fetchJsonWithTimeout<HourlyPayload>(marineUrl).then((payload) => {
      result.marine = payload;
      result.sources.marineSuccess = true;
    })
  ];

  if (worldTidesUrl) {
    tasks.push(
      fetchJsonWithTimeout<TidePayload>(worldTidesUrl)
        .then((payload) => {
          if ((payload as TidePayload).status && (payload as TidePayload).status !== 200) {
            throw new Error('worldtides status error');
          }
          result.tide = payload;
          result.sources.tideSuccess = true;
        })
        .catch(() => {
          result.sourceNotes.push('조석 API 응답 실패: 조석 데이터 미수집');
        })
    );
  } else {
    result.sourceNotes.push('조석 API 키 미설정: 조석 데이터 미수집');
  }

  await Promise.allSettled(tasks);

  if (!result.sources.weatherSuccess) {
    result.sourceNotes.push('기상 API 호출 실패: 풍속/강수 미수집');
  }

  if (!result.sources.marineSuccess) {
    result.sourceNotes.push('해양 API 호출 실패: 파고/해류/수온 미수집');
  }

  return result;
}

function getConditionsBuilder(
  weather: HourlyPayload | null,
  marine: HourlyPayload | null,
  tide: TidePayload | null
) {
  return (datetime: string): ObservedConditionsInput => {
    const weatherWind = valueAtTime(weather, 'wind_speed_10m', datetime);
    const weatherRain = valueAtTime(weather, 'precipitation', datetime);

    const waveHeight = valueAtTime(marine, 'wave_height', datetime);
    const current = valueAtTime(marine, 'current_speed', datetime);
    const seaTemperature =
      valueAtTime(marine, 'sea_surface_temperature', datetime) ??
      valueAtTime(marine, 'water_temperature', datetime) ??
      valueAtTime(marine, 'temperature', datetime);

    const tideInfo = aggregateTideRangeByDate(tide, datetime);
    const tideRange = tideInfo.range;
    const tideHeight = tideInfo.height;

    const currentKnots = typeof current === 'number' ? Math.max(0.01, current * 1.9438444924406) : undefined;

    const activeSources = new Set<string>(['']);
    if (isNumberPresent(weatherWind) || isNumberPresent(weatherRain)) activeSources.add('openmeteo_weather_hourly');
    if (isNumberPresent(waveHeight) || isNumberPresent(current) || isNumberPresent(seaTemperature)) {
      activeSources.add('openmeteo_marine_hourly');
    }
    if (isNumberPresent(tideRange) || isNumberPresent(tideHeight)) {
      activeSources.add('worldtides_extremes');
    }
    const dataSources = Array.from(activeSources).filter((entry) => entry);

    const sourcesCount = [
      weatherWind,
      weatherRain,
      waveHeight,
      seaTemperature,
      current,
      tideRange,
      tideHeight,
      currentKnots
    ].filter(isNumberPresent).length;
    const sourceConfidence = clampNum(0.05 * sourcesCount, 0, 0.95);

    return {
      tide_range: typeof tideRange === 'number' ? clampNum(tideRange, 0.2, 9) : undefined,
      tide_height: typeof tideHeight === 'number' ? clampNum(tideHeight, -3, 3) : undefined,
      current_speed: currentKnots,
      wind_speed: weatherWind,
      wave_height: waveHeight,
      precipitation: weatherRain,
      underwater_visibility: undefined,
      water_temperature: seaTemperature,
      jellyfish_risk: undefined,
      source_confidence: sourceConfidence,
      data_sources: dataSources.length ? dataSources : ['실측 공개 데이터 미수집']
    };
  };
}

function isNumberPresent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const lat = getQueryNumber(searchParams, 'lat');
  const lng = getQueryNumber(searchParams, 'lng');
  const date = parseDateString(searchParams.get('date'));
  const daysValue = getQueryNumber(searchParams, 'days');
  const targetMin = getQueryNumber(searchParams, 'targetMin');
  const targetMax = getQueryNumber(searchParams, 'targetMax');
  const timezoneParam = parseTimeZone(searchParams.get('tz'));

  if (lat === null || lng === null) {
    return NextResponse.json(
      { message: '위도/경도(lat, lng)가 필요합니다.' },
      { status: 400 }
    );
  }

  if (!date) {
    return NextResponse.json({ message: 'date(YYYY-MM-DD)가 필요합니다.' }, { status: 400 });
  }

  if (daysValue === null || !Number.isFinite(daysValue)) {
    return NextResponse.json({ message: '체류일수(days)가 필요합니다.' }, { status: 400 });
  }

  const normalizedMin = Math.min(
    Math.max(1, targetMin ?? 3),
    targetMax !== null ? targetMax : Number.POSITIVE_INFINITY
  );
  const normalizedMax = targetMax === null ? 10 : Math.max(normalizedMin, targetMax);
  const days = Math.max(1, Math.min(14, Math.floor(daysValue)));

  try {
    const start = new Date(`${date}T00:00:00`);
    const startDate = formatDate(start);
    const endDate = formatDate(addDays(start, days + 2));

    const providerStates = await fetchProviderStates(lat, lng, startDate, endDate, timezoneParam);
    const getConditionsAt = getConditionsBuilder(
      providerStates.weather,
      providerStates.marine,
      providerStates.tide
    );

    const data: PeriodRecommendation = await buildPeriodRecommendation(
      {
        datetime: `${startDate}T00:00:00`,
        latitude: lat,
        longitude: lng,
        days,
        targetDepthMin: normalizedMin,
        targetDepthMax: normalizedMax
      },
      async (datetime) => {
        const conditions = getConditionsAt(datetime);
        const sourceConfidence = Number(conditions.source_confidence ?? 0);
        return {
          ...conditions,
          source_confidence: clampNum(sourceConfidence, 0.05, 0.95),
          data_sources: Array.from(new Set(conditions.data_sources || ['실측 공개 데이터 미수집']))
        };
      }
    );

    const note = [
      `데이터 수집: ${providerStates.sources.weatherSuccess ? '기상(Open-Meteo): OK' : '기상(Open-Meteo): 미수집'}, ${
        providerStates.sources.marineSuccess ? '해양(Open-Meteo Marine): OK' : '해양(Open-Meteo Marine): 미수집'
      }, ${providerStates.sources.tideSuccess ? '조석(WorldTides): OK' : '조석(WorldTides): 미수집'}`
    ];

    if (providerStates.sourceNotes.length) {
      note.push(...providerStates.sourceNotes);
    }

    return NextResponse.json({
      location: {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6))
      },
      request: {
        startDate,
        days,
        targetDepth: {
          min: normalizedMin,
          max: normalizedMax
        }
      },
      data,
      note: note.join(' | ')
    });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : 'unknown';
    const fallbackStart = new Date(`${date}T00:00:00`);
    const fallbackStartDate = formatDate(fallbackStart);
    const fallbackEndDate = formatDate(addDays(fallbackStart, Math.max(1, days - 1)));
    const safeMin = Number.isFinite(normalizedMin) ? normalizedMin : 3;
    const safeMax = Number.isFinite(normalizedMax) ? normalizedMax : 10;
    const fallbackPeriodScore = 0;

    return NextResponse.json({
      location: {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6))
      },
      request: {
        startDate: fallbackStartDate,
        days,
        targetDepth: {
          min: safeMin,
          max: safeMax
        }
      },
      data: {
        period: {
          startDate: fallbackStartDate,
          days,
          endDate: fallbackEndDate
        },
        summary: {
          score: fallbackPeriodScore,
          status: '주의',
          confidence: 0.05,
          message: `추천 계산 처리 중 오류가 발생했습니다. (${safeMessage})`
        },
        daily: [],
        dataReferences: DATA_REFERENCE_CATALOG
      },
      note: `데이터 계산 실패: ${safeMessage}. 일부 실측 공공데이터 미수집/조회 오류가 있었을 수 있습니다.`
    });
  }
}
