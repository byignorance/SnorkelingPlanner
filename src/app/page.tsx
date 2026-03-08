'use client';

import { FormEvent, useMemo, useState } from 'react';

type DataReference = {
  category: string;
  source: string;
  method: string;
  threshold: string;
  reliability_note: string;
};

type Factor = {
  key: string;
  label: string;
  score: number;
  weight: number;
  value: number;
  grade: 'good' | 'normal' | 'bad';
  detail: string;
};

type FactorTimeSeriesPoint = {
  time: string;
  value: number;
  score: number;
  grade: 'good' | 'normal' | 'bad';
  detail: string;
};

type DayFactorSeries = Record<string, FactorTimeSeriesPoint[]>;

type DayResult = {
  date: string;
  bestTime: string;
  summary: {
    score: number;
    status: '좋음' | '보통' | '주의';
    confidence: number;
    message: string;
  };
  factors: Factor[];
  timeSeries: DayFactorSeries;
  usedSources: string[];
};

type Response = {
  location: { latitude: number; longitude: number };
  request: {
    startDate: string;
    days: number;
    targetDepth: { min: number; max: number };
  };
  data: {
    period: {
      startDate: string;
      days: number;
      endDate: string;
    };
    summary: {
      score: number;
      status: '좋음' | '보통' | '주의';
      confidence: number;
      message: string;
    };
    daily: DayResult[];
    dataReferences: DataReference[];
  };
  note?: string;
};

type AppStep = 'landing' | 'input' | 'result';

type OverviewMetricItem = {
  key: string;
  label: string;
  icon: string;
  value: string;
  points: {
    date: string;
    value: string;
    grade: Factor['grade'];
  }[];
};

const DEFAULT = {
  targetMin: 3,
  targetMax: 10,
  stayDays: 3
};

const OVERVIEW_FACTOR_KEYS = [
  'tides_and_currents',
  'wind_speed',
  'wave_height',
  'visibility_and_precipitation',
  'water_and_hazards'
];

const DETAIL_FACTOR_KEYS = [
  'tides_and_currents',
  'wind_speed',
  'wave_height',
  'visibility_and_precipitation',
  'water_and_hazards',
  'early_morning_bonus',
  'depth_fit_bonus'
];

const OVERVIEW_FACTOR_META: Record<string, { label: string; icon: string }> = {
  tides_and_currents: { label: '조석 · 조류', icon: 'water' },
  wind_speed: { label: '풍속', icon: 'air' },
  wave_height: { label: '파고', icon: 'waves' },
  visibility_and_precipitation: { label: '가시거리/강수', icon: 'visibility' },
  water_and_hazards: { label: '수온', icon: 'thermometer' },
  early_morning_bonus: { label: '이른 아침 정화 가점', icon: 'wb_sunny' },
  depth_fit_bonus: { label: '수심 적합도', icon: 'layers' }
};

const LANDING_FEATURES = [
  {
    title: '시간별 추천',
    detail: '06:00~17:00 사이 30분 단위(06:00, 06:30, …, 17:00)로 전 구간을 점검해 최적 시간을 추천합니다.'
  },
  {
    title: '이른 아침 정화 가점',
    detail: '이른 시간대에 부유물 침강/탁도 저하 가점(0.1~0.15)을 반영합니다.'
  },
  {
    title: '수심 우선순위',
    detail: '목표 수심(기본 3~10m)에 맞춰 만조·썰물에 따른 유효수심을 반영합니다.'
  }
];

const FEATURE_SPOTS = [
  {
    name: 'Blue Lagoon',
    place: 'Bali, Indonesia',
    rating: 4.9,
    distance: '12km',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpEhDHiYV_bg_CclBM7WGGXiXuZmjPiQ-ZEkyJ6EfjY91KlQ2yxVbOZxTHtLJ42LANlNkG7md8KWvh40UrGF3XhrGWZY657FQYdBV2WpDzSNPQ8wX-ulPZups8sO9GzUlcmSjEDswlIcCq8mao-09vHJ3qEv30o8FqQ_aSBf3wGq_MKs83oef0_9WeJvdlWwu6J6nq3WtUU0-Y4N6BeNZkjCf10__vaXPXMWqFLYow2An1SJhq58-fCf3ZxKWUflc33j_mTBFWDQo'
  },
  {
    name: 'Amed Beach',
    place: 'Bali, Indonesia',
    rating: 4.7,
    distance: '45km',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDHPvCaIx41V8Hn5gB3NaPum62Mrg9Jh6yzYRsYjC9_AJK-j_L0_JCPw15RAIcrGe48-ZzQWczbSpzQSqi0uUYrQsMMEiejdSqb0CZVptEZUBpY5FZ2VfVvmc0-GLorFb7HEvigeeqUdNwxDQ_7Lv0_6t6pCrEApI2yHPAPrvkZ5ArwLAql5cPsEWWh06GtGWq4Cp9jzyttWyx1KA3JrDIdk6bafYhB1tSljLTFGAks9qVOSiWXlpKcJJNWAcLzQSIxe5fZ6RZ2mXc'
  },
  {
    name: 'Menjangan Island',
    place: 'Bali, Indonesia',
    rating: 4.9,
    distance: '82km',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBhlwcPy1bsyz0PU7HVNmcjpKWMxWXaQUVas5serUbmHu-UccPgIKuegRqM_hO7M4y6hXkbtl2lqxGnV6FczkTmSRKdV5vyxpjtGKIr6hRaL6FnDqUXqP2uwgym8KsXG3OgsacSmYvAfala8AZh4fmRTqsnHWddFbatYh5VdSsN_cyy5PXjYRVYYlwNLmOSNk2EBrnJSbfo-HD8Z_8nIcLrUen63WlMK36naeXRqh6V18rEnliKjhjoIP9V4SBTu9_mGWrE2d9qfHA'
  }
];

const GRADE_TEXT: Record<Factor['grade'], string> = {
  good: '좋음',
  normal: '보통',
  bad: '주의'
};

const NAV_ITEMS: { key: AppStep; icon: string; label: string }[] = [
  { key: 'landing', icon: 'home', label: 'Home' },
  { key: 'input', icon: 'edit_note', label: 'Analyze' },
  { key: 'result', icon: 'timeline', label: 'Result' }
];

function todayLabel() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  return fmt.format(now);
}

function getLocalDateString(target = new Date()): string {
  const yy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getFactorByKey(day: DayResult, key: string): Factor | undefined {
  return day.factors.find((item) => item.key === key);
}

function getFactorIcon(key: string): string {
  return OVERVIEW_FACTOR_META[key]?.icon || 'insights';
}

function parseNumberFromText(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match || !match[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function gradeFromScore(score: number): Factor['grade'] {
  if (score >= 0.7) return 'good';
  if (score >= 0.35) return 'normal';
  return 'bad';
}

function getPrecipitationFromVisibilityText(detail: string | undefined): number | undefined {
  if (!detail) return undefined;
  return parseNumberFromText(detail, /강수\s*([0-9]+(?:\.[0-9]+)?)\s*mm\/h/);
}

function getTideHeightFromDetail(detail: string | undefined): number | undefined {
  if (!detail) return undefined;
  return parseNumberFromText(detail, /조차\s*([0-9]+(?:\.[0-9]+)?)m/);
}

function getCurrentFromDetail(detail: string | undefined): number | undefined {
  if (!detail) return undefined;
  return parseNumberFromText(detail, /조류\s*([0-9]+(?:\.[0-9]+)?)\s*kt/);
}

function getTemperatureLabel(temp: number | undefined): string {
  if (temp === undefined) return '수온 정보 없음';
  if (temp >= 28 && temp <= 30) return '최적';
  if (temp <= 22) return '저온(수트 필요)';
  if (temp <= 25) return '약간 추움';
  return '보통';
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function average(values: number[]): number {
  if (!values.length) return Number.NaN;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function formatFactorValue(key: string, point: FactorTimeSeriesPoint): string {
  const detail = point.detail;
  if (key === 'tides_and_currents') {
    const range = getTideHeightFromDetail(detail);
    const current = getCurrentFromDetail(detail);
    if (range !== undefined && current !== undefined) {
      return `조차 ${range.toFixed(2)}m / 조류 ${current.toFixed(2)}kt`;
    }
    if (range !== undefined) return `조차 ${range.toFixed(2)}m`;
    if (current !== undefined) return `조류 ${current.toFixed(2)}kt`;
    return detail || '조석/조류 자료 없음';
  }

  if (key === 'wind_speed') {
    if (!Number.isFinite(point.value)) return '풍속 자료 없음';
    return `풍속 ${point.value.toFixed(1)} m/s`;
  }

  if (key === 'wave_height') {
    if (!Number.isFinite(point.value)) return '파고 자료 없음';
    return `파고 ${point.value.toFixed(2)} m`;
  }

  if (key === 'visibility_and_precipitation') {
    if (!Number.isFinite(point.value) && getPrecipitationFromVisibilityText(detail) === undefined) {
      return '가시/강수 자료 없음';
    }
    const precipitation = getPrecipitationFromVisibilityText(detail);
    if (Number.isFinite(point.value) && precipitation !== undefined) {
      return `가시 ${point.value.toFixed(1)}m / 강수 ${precipitation.toFixed(1)}mm/h`;
    }
    if (Number.isFinite(point.value)) return `가시 ${point.value.toFixed(1)}m`;
    if (precipitation !== undefined) return `강수 ${precipitation.toFixed(1)}mm/h`;
    return '가시/강수 자료 없음';
  }

  if (key === 'water_and_hazards') {
    if (!Number.isFinite(point.value)) return '수온 자료 없음';
    return `수온 ${point.value.toFixed(1)}°C (${getTemperatureLabel(point.value)})`;
  }

  if (key === 'early_morning_bonus') {
    if (!Number.isFinite(point.value)) return '가점 없음';
    return `가점 ${Math.round(point.value * 100)}%`;
  }

  if (key === 'depth_fit_bonus') {
    if (!Number.isFinite(point.value)) return '수심 적합도 자료 없음';
    return `수심 적합도 ${point.value.toFixed(2)}`;
  }

  return detail || '상세 자료 없음';
}

function buildOverviewMetrics(result: Response): OverviewMetricItem[] {
  if (!result.data.daily.length) return [];

  const metricPointsByKey: Record<string, { date: string; value: string; grade: Factor['grade'] }[]> = {};

  const periodValues: Record<
    string,
    {
      value: number[];
      valueAlt: number[];
      score: number[];
    }
  > = {};

  const collectMetricDay = (
    key: string,
    date: string,
    valueText: string | undefined,
    score: number,
    value: number | undefined,
    altValue?: number
  ) => {
    if (!metricPointsByKey[key]) metricPointsByKey[key] = [];
    metricPointsByKey[key].push({
      date,
      value: valueText || '자료 없음',
      grade: gradeFromScore(score)
    });

    if (typeof value === 'number' && Number.isFinite(value)) {
      periodValues[key] = periodValues[key] || { value: [], valueAlt: [], score: [] };
      periodValues[key].value.push(value);
    }

    if (typeof altValue === 'number' && Number.isFinite(altValue)) {
      periodValues[key] = periodValues[key] || { value: [], valueAlt: [], score: [] };
      periodValues[key].valueAlt.push(altValue);
    }
    periodValues[key] = periodValues[key] || { value: [], valueAlt: [], score: [] };
    periodValues[key].score.push(score);
  };

  for (const day of result.data.daily) {
    const date = day.date;

    const tides = day.timeSeries?.tides_and_currents || [];
    if (tides.length) {
      const tideRanges = tides.map((point) => getTideHeightFromDetail(point.detail)).filter(isFiniteNumber);
      const currents = tides.map((point) => getCurrentFromDetail(point.detail)).filter(isFiniteNumber);
      const score = average(tides.map((point) => point.score));
      const tideRangeAvg = tideRanges.length ? average(tideRanges) : Number.NaN;
      const currentAvg = currents.length ? average(currents) : Number.NaN;
      const valueText =
        tideRangeAvg === tideRangeAvg && currentAvg === currentAvg
          ? `조차 ${tideRangeAvg.toFixed(2)}m / 조류 ${currentAvg.toFixed(2)}kt`
          : tideRangeAvg === tideRangeAvg
          ? `조차 ${tideRangeAvg.toFixed(2)}m`
          : currentAvg === currentAvg
          ? `조류 ${currentAvg.toFixed(2)}kt`
          : '조석/조류 정보 없음';
      collectMetricDay('tides_and_currents', date, valueText, score, tideRangeAvg, currentAvg);
    } else {
      metricPointsByKey['tides_and_currents'] = metricPointsByKey['tides_and_currents'] || [];
      metricPointsByKey['tides_and_currents'].push({
        date,
        value: '조석/조류 정보 없음',
        grade: 'bad'
      });
      periodValues['tides_and_currents'] = periodValues['tides_and_currents'] || { value: [], valueAlt: [], score: [] };
      periodValues['tides_and_currents'].score.push(0);
    }

    const makeMetric = (key: string, toText: (value: number) => string) => {
        const series = day.timeSeries?.[key] || [];
      const values = series.map((point) => point.value).filter(isFiniteNumber);
      const scores = series.map((point) => point.score);
      const avgValue = values.length ? average(values) : Number.NaN;

      let valueText = '정보 없음';
      if (key === 'visibility_and_precipitation') {
        const rain = series
          .map((point) => getPrecipitationFromVisibilityText(point.detail))
          .filter(isFiniteNumber);
        const avgRain = rain.length ? average(rain) : Number.NaN;
        if (avgValue === avgValue && avgRain === avgRain) {
          valueText = `가시 ${avgValue.toFixed(1)}m / 강수 ${avgRain.toFixed(1)}mm/h`;
        } else if (avgValue === avgValue) {
          valueText = `가시 ${avgValue.toFixed(1)}m`;
        } else if (avgRain === avgRain) {
          valueText = `강수 ${avgRain.toFixed(1)}mm/h`;
        }
      } else if (avgValue === avgValue) {
        valueText = toText(avgValue);
      }

      if (!Number.isFinite(avgValue)) {
        if (key === 'water_and_hazards') {
          valueText = '수온 정보 없음';
        } else if (key === 'wind_speed') {
          valueText = '풍속 정보 없음';
        } else if (key === 'wave_height') {
          valueText = '파고 정보 없음';
        }
      }

      const scoreAvg = scores.length ? average(scores) : 0;
      collectMetricDay(key, date, valueText, scoreAvg, avgValue);
    };

    makeMetric('wind_speed', (value) => `${value.toFixed(1)} m/s`);
    makeMetric('wave_height', (value) => `${value.toFixed(2)} m`);
    makeMetric('water_and_hazards', (value) => `${value.toFixed(1)}°C (${getTemperatureLabel(value)})`);
    makeMetric('visibility_and_precipitation', () => '가시거리/강수');
  }

  const formatMetricSummary = (key: string) => {
    const values = periodValues[key]?.value || [];
    if (key === 'tides_and_currents') {
      const rangeAvg = values.length ? average(values) : Number.NaN;
      const currentAvg = periodValues[key]?.valueAlt ? average(periodValues[key].valueAlt) : Number.NaN;
      if (rangeAvg === rangeAvg && currentAvg === currentAvg) {
        return `조차 ${rangeAvg.toFixed(2)}m / 조류 ${currentAvg.toFixed(2)}kt`;
      }
      if (rangeAvg === rangeAvg) return `조차 ${rangeAvg.toFixed(2)}m`;
      if (currentAvg === currentAvg) return `조류 ${currentAvg.toFixed(2)}kt`;
      return '조석/조류 정보 없음';
    }

    if (!values.length) {
      if (key === 'water_and_hazards') return '수온 정보 없음';
      if (key === 'wind_speed') return '풍속 정보 없음';
      if (key === 'wave_height') return '파고 정보 없음';
      if (key === 'visibility_and_precipitation') return '가시/강수 정보 없음';
      return '정보 없음';
    }

    const avg = average(values);
    if (key === 'wind_speed') return `${avg.toFixed(1)} m/s`;
    if (key === 'wave_height') return `${avg.toFixed(2)} m`;
    if (key === 'water_and_hazards') return `${avg.toFixed(1)}°C (${getTemperatureLabel(avg)})`;
    if (key === 'visibility_and_precipitation') {
      const precipValues = result.data.daily
            .map((day) =>
          day.timeSeries?.visibility_and_precipitation
            ?.map((point) => getPrecipitationFromVisibilityText(point.detail))
            .filter(isFiniteNumber)
        )
        .flat()
        .filter((value): value is number => Number.isFinite(value));

      if (precipValues.length) {
        return `가시 ${avg.toFixed(1)}m / 강수 ${(average(precipValues) || 0).toFixed(1)}mm/h`;
      }
      return `가시 ${avg.toFixed(1)}m`;
    }

    return '정보 없음';
  };

  return OVERVIEW_FACTOR_KEYS.map((key) => {
    const meta = OVERVIEW_FACTOR_META[key];
    const points = metricPointsByKey[key] || [];
    return {
      key,
      label: meta.label,
      icon: meta.icon,
      value: formatMetricSummary(key),
      points:
        points.length > 0
          ? points
          : result.data.daily.map((day) => ({
              date: day.date,
              value: '자료 없음',
              grade: 'bad'
            }))
    };
  });
}

function statusBadgeClass(status: '좋음' | '보통' | '주의') {
  if (status === '좋음') return 'status-success';
  if (status === '보통') return 'status-warning';
  return 'status-danger';
}

function mapGradeToStatus(grade: Factor['grade']): '좋음' | '보통' | '주의' {
  if (grade === 'good') return '좋음';
  if (grade === 'normal') return '보통';
  return '주의';
}

function statusCardClass(status: '좋음' | '보통' | '주의') {
  if (status === '좋음') return 'good';
  if (status === '보통') return 'normal';
  return 'bad';
}

function gradeClass(grade: Factor['grade']) {
  if (grade === 'good') return 'good';
  if (grade === 'normal') return 'normal';
  return 'bad';
}

function scoreBand(score: number) {
  if (score >= 0.85) return 'excellent';
  if (score >= 0.7) return 'good';
  if (score >= 0.5) return 'normal';
  return 'bad';
}

export default function HomePage() {
  const [step, setStep] = useState<AppStep>('landing');
  const [statusText, setStatusText] = useState('위치·날짜·체류 기간·수심 입력하고 분석을 시작하세요.');
  const [isLoading, setIsLoading] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [stayDays, setStayDays] = useState(String(DEFAULT.stayDays));
  const [targetMin, setTargetMin] = useState(String(DEFAULT.targetMin));
  const [targetMax, setTargetMax] = useState(String(DEFAULT.targetMax));
  const [result, setResult] = useState<Response | null>(null);
  const [expandedOverviewMetric, setExpandedOverviewMetric] = useState<string | null>(null);
  const [expandedDayFactor, setExpandedDayFactor] = useState<Record<string, string | null>>({});

  const mapUrl = useMemo(() => {
    if (!latitude || !longitude) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }, [latitude, longitude]);

  const uniqueSources = useMemo(() => {
    if (!result) return [];
    const set = new Set<string>();
    result.data.daily.forEach((item) => item.usedSources.forEach((entry) => set.add(entry)));
    return Array.from(set);
  }, [result]);

  const overviewMetrics = useMemo(() => {
    if (!result) return [] as OverviewMetricItem[];
    return buildOverviewMetrics(result);
  }, [result]);

  const toggleOverviewMetric = (key: string) => {
    setExpandedOverviewMetric((prev) => (prev === key ? null : key));
  };

  const getDayFactorKey = (date: string, factorKey: string) => `${date}-${factorKey}`;
  const toggleDayFactor = (date: string, factorKey: string) => {
    const key = getDayFactorKey(date, factorKey);
    setExpandedDayFactor((prev) => {
      const next = { ...prev };
      next[key] = prev[key] === factorKey ? null : factorKey;
      return next;
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusText('브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setStatusText('현재 위치를 기준으로 입력이 준비되었습니다.');
      },
      () => {
        setStatusText('위치 권한이 거부되었습니다. 좌표를 직접 입력해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    const parsedMin = Number(targetMin);
    const parsedMax = Number(targetMax);
    const parsedDays = Number(stayDays);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      setStatusText('유효한 위도/경도를 입력해 주세요.');
      return;
    }

    if (
      Number.isNaN(parsedMin) ||
      Number.isNaN(parsedMax) ||
      parsedMin <= 0 ||
      parsedMax <= 0 ||
      parsedMin > parsedMax
    ) {
      setStatusText('목표 수심 입력이 올바르지 않습니다. (최소 ≤ 최대, 1 이상)');
      return;
    }

    if (!Number.isFinite(parsedDays) || parsedDays <= 0 || parsedDays > 14) {
      setStatusText('체류일수는 1~14일 범위여야 합니다.');
      return;
    }

    setIsLoading(true);
    setStatusText('체류 기간 기반 추천을 계산 중입니다...');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(
        `/api/recommend?lat=${parsedLat}&lng=${parsedLng}&date=${date}&days=${parsedDays}&targetMin=${parsedMin}&targetMax=${parsedMax}&tz=${encodeURIComponent(
          timezone
        )}`
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setStatusText(err?.message ?? '요청에 실패했습니다.');
        return;
      }

      const payload = (await response.json()) as Response;
      setResult(payload);
      setStatusText('분석 완료');
      setStep('result');
    } catch {
      setStatusText('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="device-shell">
        <main className="app-shell">
        {step === 'landing' && (
          <>
            <header className="top-bar">
              <div className="avatar" />
              <div className="greeting-block">
                <p className="small-text">{todayLabel()}</p>
                <h2>Good Morning, Diver!</h2>
              </div>
              <button className="icon-btn" type="button" aria-label="알림">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </header>

            <section className="search-row">
              <label className="search-bar">
                <span className="material-symbols-outlined">search</span>
                <input placeholder="목적지/포인트 검색" />
              </label>
            </section>

            <section className="hero-card large-card">
              <div
                className="hero-media"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCpEhDHiYV_bg_CclBM7WGGXiXuZmjPiQ-ZEkyJ6EfjY91KlQ2yxVbOZxTHtLJ42LANlNkG7md8KWvh40UrGF3XhrGWZY657FQYdBV2WpDzSNPQ8wX-ulPZups8sO9GzUlcmSjEDswlIcCq8mao-09vHJ3qEv30o8FqQ_aSBf3wGq_MKs83oef0_9WeJvdlWwu6J6nq3WtUU0-Y4N6BeNZkjCf10__vaXPXMWqFLYow2An1SJhq58-fCf3ZxKWUflc33j_mTBFWDQo')"
                }}
              >
                <div className="chip-row">
                  <span className="chip">
                    <span className="material-symbols-outlined">sunny</span>
                    29°C
                  </span>
                  <span className="chip">
                    <span className="material-symbols-outlined">tsunami</span>
                    0.4m
                  </span>
                </div>
              </div>
              <div className="hero-content">
                <div className="hero-meta-row">
                  <span className="chip-subtle">오늘의 추천 스팟</span>
                  <span className="score-pill">
                    <span className="material-symbols-outlined">grade</span>
                    4.9
                  </span>
                </div>

                <h3>Blue Lagoon, Bali</h3>

                <div className="kpi-grid">
                  <div>
                    <span className="tiny-label">Water Temp</span>
                    <strong>28°C</strong>
                  </div>
                  <div className="divider" />
                  <div>
                    <span className="tiny-label">Visibility</span>
                    <strong>15m Clear</strong>
                  </div>
                  <div className="divider" />
                  <div>
                    <span className="tiny-label">Tide</span>
                    <strong>Low at 14:00</strong>
                  </div>
                </div>

                <button className="btn" type="button" onClick={() => setStep('input')}>
                  시작하기
                </button>
              </div>
            </section>

            <section className="section-title-row">
              <h3>추천 핵심 기준</h3>
            </section>
            <section className="feature-panel feature-list">
              {LANDING_FEATURES.map((item) => (
                <article key={item.title} className="feature-item">
                  <div className="feature-index">•</div>
                  <div>
                    <p className="feature-title">{item.title}</p>
                    <p className="feature-detail">{item.detail}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="section-title-row">
              <h3>Suggested Spots</h3>
            </section>
            <section className="spot-scroll">
              {FEATURE_SPOTS.map((spot) => (
                <article key={spot.name} className="spot-card">
                  <div className="spot-cover" style={{ backgroundImage: `url('${spot.image}')` }}>
                    <button className="spot-fav" type="button" aria-label="즐겨찾기">
                      <span className="material-symbols-outlined">favorite</span>
                    </button>
                  </div>
                  <div className="spot-meta">
                    <p>{spot.name}</p>
                    <div className="spot-meta-row">
                      <span>{spot.distance}</span>
                      <span>
                        <span className="material-symbols-outlined star">star</span>
                        {spot.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {step === 'input' && (
          <>
            <header className="top-bar">
              <button className="icon-btn" type="button" onClick={() => setStep('landing')} aria-label="뒤로가기">
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <div className="greeting-block">
                <p className="small-text">스노클링 플래너</p>
                <h2>데이터 입력</h2>
              </div>
              <button className="icon-btn" type="button" onClick={useCurrentLocation} aria-label="현재 위치">
                <span className="material-symbols-outlined">my_location</span>
              </button>
            </header>

            <section className="input-card">
              <form onSubmit={onSubmit} className="form-grid">
                <label>
                  <span>위도</span>
                  <input
                    value={latitude}
                    inputMode="decimal"
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="33.560"
                    required
                  />
                </label>
                <label>
                  <span>경도</span>
                  <input
                    value={longitude}
                    inputMode="decimal"
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="126.490"
                    required
                  />
                </label>
                <label>
                  <span>시작 날짜</span>
                  <input
                    value={date}
                    type="date"
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>체류 기간(일)</span>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    step="1"
                    value={stayDays}
                    onChange={(e) => setStayDays(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>목표 수심 최소 (m)</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={targetMin}
                    onChange={(e) => setTargetMin(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>목표 수심 최대 (m)</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={targetMax}
                    onChange={(e) => setTargetMax(e.target.value)}
                    required
                  />
                </label>

                <button className="btn" type="submit" disabled={isLoading}>
                  {isLoading ? '분석 중...' : '체류 기간 분석 시작'}
                </button>
              </form>

              <div className="map-row">
                <button className="btn btn-outline" type="button" onClick={useCurrentLocation}>
                  <span className="material-symbols-outlined">my_location</span>
                  현재 위치로 입력
                </button>

                {mapUrl && (
                  <a className="mini-link" href={mapUrl} target="_blank" rel="noreferrer">
                    <span className="material-symbols-outlined">place</span>
                    Google 지도에서 좌표 열기
                  </a>
                )}
              </div>

              <p className="status-text">{statusText}</p>
            </section>

            <section className="tip-card">
                <div className="tip-title">체류 분석 노트</div>
                <p>
                  추천은 06:00~17:00 사이 30분 간격으로 점검한 시간대 중 가장 좋은 구간을 제공합니다.
                </p>
              </section>
          </>
        )}

        {step === 'result' && (
          <>
            {result ? (
              <>
                <header className="top-bar">
                  <button className="icon-btn" type="button" onClick={() => setStep('input')} aria-label="뒤로가기">
                    <span className="material-symbols-outlined">arrow_back_ios_new</span>
                  </button>
                  <div className="greeting-block">
                    <p className="small-text">Result</p>
                    <h2>결과 분석</h2>
                  </div>
                  <button className="icon-btn" type="button" onClick={() => setStep('input')} aria-label="다시 계산">
                    <span className="material-symbols-outlined">refresh</span>
                  </button>
                </header>

                <section className="result-summary large-card">
                  <div className="result-title-row">
                    <div>
                      <p className="small-text">체류 기간</p>
                      <p className={`score-title ${scoreBand(result.data.summary.score)}`}>
                        {Math.round(result.data.summary.score * 100)} / 100
                      </p>
                      <p className="small-text">
                        {result.data.period.startDate} ~ {result.data.period.endDate} ({result.data.period.days}일)
                      </p>
                    </div>
                    <span className={`status-pill ${statusBadgeClass(result.data.summary.status)}`}>
                      {result.data.summary.status}
                    </span>
                  </div>
                  <p>{result.data.summary.message}</p>

                <div className="result-stats-grid">
                    <div>
                      <span className="tiny-label">신뢰도</span>
                      <strong>{Math.round(result.data.summary.confidence * 100)}%</strong>
                    </div>
                    <div>
                      <span className="tiny-label">좌표</span>
                      <strong>
                        {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                      </strong>
                    </div>
                  <div>
                    <span className="tiny-label">목표 수심</span>
                    <strong>
                      {result.request.targetDepth.min}m ~ {result.request.targetDepth.max}m
                    </strong>
                  </div>
                </div>
                <div className="overview-metrics">
                  {overviewMetrics.map((item) => (
                    <article
                      key={item.key}
                      className={`overview-metric ${expandedOverviewMetric === item.key ? 'open' : ''}`}
                    >
                      <span className="metric-icon-wrap">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </span>
                      <div className="overview-metric-body">
                        <div className="overview-metric-title-row">
                          <div>
                            <p className="tiny-label">{item.label}</p>
                            <strong>{item.value}</strong>
                          </div>
                          <button
                            type="button"
                            className="overview-toggle-btn"
                            onClick={() => toggleOverviewMetric(item.key)}
                            aria-label="항목 상세 보기"
                          >
                            <span className="material-symbols-outlined">
                              {expandedOverviewMetric === item.key ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                        {expandedOverviewMetric === item.key ? (
                          <div className="overview-metric-details">
                            {item.points.map((point) => (
                              <div key={point.date} className="overview-detail-item">
                                <span>{point.date}</span>
                                <span>{point.value}</span>
                                <span
                                  className={`status-pill compact ${statusBadgeClass(
                                    mapGradeToStatus(point.grade)
                                  )}`}
                                >
                                  {GRADE_TEXT[point.grade]}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                <p className="meta-row">{result.note}</p>
              </section>

                <section className="result-card">
                  <div className="section-title-row">
                    <h3>날짜별 추천</h3>
                  </div>
                  <div className="day-list">
                    {result.data.daily.map((day) => (
                      <article key={day.date} className={`day-item ${statusCardClass(day.summary.status)}`}>
                        <div className="day-item-head">
                          <div>
                            <h4>{day.date}</h4>
                            <p className="small-text">최적 시간: {day.bestTime}</p>
                          </div>
                          <span className={`status-pill ${statusBadgeClass(day.summary.status)}`}>
                            {day.summary.status}
                          </span>
                        </div>
                        <div className="score-bar-wrap">
                          <div className="score-bar" style={{ width: `${day.summary.score * 100}%` }} />
                        </div>
                        <p>{day.summary.message}</p>

                        <div className="factor-grid">
                          {DETAIL_FACTOR_KEYS.map((key) => {
                            const factor = getFactorByKey(day, key);
                            const fallbackLabel = OVERVIEW_FACTOR_META[key]?.label || key;
                            const resolvedFactor = factor ?? {
                              key,
                              label: fallbackLabel,
                              score: 0,
                              weight: 0,
                              value: Number.NaN,
                              grade: 'bad' as const,
                              detail: '데이터 없음'
                            };
                            const keyId = getDayFactorKey(day.date, key);
                            const isExpanded = expandedDayFactor[keyId] === key;
                            const details = day.timeSeries?.[key] || [];

                            return (
                              <div key={resolvedFactor.key} className={`factor-item-wrap ${isExpanded ? 'open' : ''}`}>
                                <button
                                  type="button"
                                  className="factor-item"
                                  onClick={() => toggleDayFactor(day.date, key)}
                                >
                                  <span className="factor-item-main">
                                    <span className="material-symbols-outlined factor-icon">
                                      {getFactorIcon(resolvedFactor.key)}
                                    </span>
                                    {resolvedFactor.label}
                                  </span>
                                  <span className="factor-item-tail">
                                    <strong>{GRADE_TEXT[resolvedFactor.grade]}</strong>
                                    <span className="material-symbols-outlined expand-icon">
                                      {isExpanded ? 'expand_less' : 'expand_more'}
                                    </span>
                                  </span>
                                </button>
                                {isExpanded ? (
                                  <div className="factor-detail-list">
                                    {details.length ? (
                                      details.map((point) => (
                                        <div key={`${keyId}-${point.time}`} className="factor-detail-item">
                                          <span>{point.time}</span>
                                          <span>{formatFactorValue(key, point)}</span>
                                          <span
                                            className={`status-pill compact ${statusBadgeClass(
                                              mapGradeToStatus(point.grade)
                                            )}`}
                                          >
                                            {GRADE_TEXT[point.grade]}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="small-muted">시간대 데이터가 없습니다.</p>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="small-muted">데이터 소스: {uniqueSources.join(', ')}</p>
                </section>

                <section className="result-card">
                  <div className="section-title-row">
                    <h3>적용 데이터 레퍼런스</h3>
                  </div>
                  <div className="reference-list">
                    {result.data.dataReferences.map((item) => (
                      <article key={item.category} className="reference-item">
                        <h4>{item.category}</h4>
                        <p>{item.source}</p>
                        <p>{item.method}</p>
                        <p>{item.threshold}</p>
                        <p>{item.reliability_note}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <p className="status-text">아직 분석된 데이터가 없습니다. 입력 화면으로 돌아가 분석을 시작해 주세요.</p>
                <button className="btn" type="button" onClick={() => setStep('input')}>
                  입력 화면으로
                </button>
              </>
            )}
          </>
        )}
        </main>

        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === 'result' && !result) return;
                setStep(item.key);
              }}
              className={step === item.key ? 'active' : ''}
              disabled={item.key === 'result' && !result}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p>{item.label}</p>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
