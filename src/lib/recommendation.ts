type JellyfishRisk = 'none' | 'low' | 'moderate' | 'high';

type ConditionInput = {
  datetime: string;
  latitude: number;
  longitude: number;
};

export type ConditionSet = {
  tide_range?: number;
  tide_height?: number;
  current_speed?: number;
  wind_speed?: number;
  wave_height?: number;
  precipitation?: number;
  underwater_visibility?: number;
  water_temperature?: number;
  jellyfish_risk?: JellyfishRisk;
  source_confidence: number;
  data_sources: string[];
};

export type ObservedConditionsInput = Partial<ConditionSet>;

type ConditionResolver = (
  datetime: string,
  latitude: number,
  longitude: number
) => Promise<ObservedConditionsInput> | ObservedConditionsInput;

export type FactorScore = {
  key: string;
  label: string;
  value: number;
  score: number;
  grade: 'good' | 'normal' | 'bad';
  weight: number;
  detail: string;
};

export type FactorTimeSeriesPoint = {
  time: string;
  value: number;
  score: number;
  grade: FactorScore['grade'];
  detail: string;
};

export type FactorTimeSeries = Record<string, FactorTimeSeriesPoint[]>;

export type DataReference = {
  category: string;
  source: string;
  method: string;
  threshold: string;
  reliability_note: string;
};

export type RecommendationResult = {
  summary: {
    score: number;
    status: '좋음' | '보통' | '주의';
    confidence: number;
    message: string;
  };
  factors: FactorScore[];
  usedSources: string[];
  generatedAt: string;
};

export type DailyRecommendation = {
  date: string;
  bestTime: string;
  summary: {
    score: number;
    status: '좋음' | '보통' | '주의';
    confidence: number;
    message: string;
  };
  factors: FactorScore[];
  timeSeries: FactorTimeSeries;
  usedSources: string[];
};

export type PeriodRecommendation = {
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
  daily: DailyRecommendation[];
  dataReferences: DataReference[];
};

export const DATA_REFERENCE_CATALOG: DataReference[] = [
  {
    category: '조석(밀물·썰물)',
    source: '해양수산청 계측소·기상청 조위 자료 + 조석 천문 조화 모형',
    method: '천문 조석(달·태양 인력) + 지역 보정값 결합',
    threshold: '조차 1.8m 이하는 우수, 3m 이상은 주의',
    reliability_note: '연안에서는 현지 계측치 보정 시 높음'
  },
  {
    category: '조류(해수 흐름)',
    source: '해양수산부 연안 조류 관측망, 항로·해협 예측모델, 해저 지형 수치모델',
    method: '관측치 + 지형 기반 예측 모델 동화',
    threshold: '조류 1.0 knots 이하 권장',
    reliability_note: '협수로·해협은 급변 가능성이 커 시간별 변동성이 큼'
  },
  {
    category: '파고·파주기',
    source: '기상청 연안 파랑 예측, 부이 실측, WAVEWATCH III 계열 모델',
    method: '단기 수면 파고와 실측 보정값 결합',
    threshold: '0.5m 이하 매우 안정 / 0.5~0.8m 조건부 가능 / 1m 이상은 배제',
    reliability_note: '스노클링 핵심 지표로 파고 가중치가 높음'
  },
  {
    category: '바람·강수',
    source: '기상청 단기예보·초단기예보, GFS·ECMWF 등 글로벌 모델',
    method: '바람 속도, 강수량, 수면 거칠기 변화 결합',
    threshold: '바람 5m/s 이상 체감 난이도 상승, 10m/s 이상은 강한 제한',
    reliability_note: '해안 지형 바람차이로 미세한 오차 존재'
  },
  {
    category: '수온',
    source: '연안 관측 부이, SST 위성 자료, 계절평균값',
    method: '현재 수온 + 계절성 변동을 함께 반영',
    threshold: '28~30°C 우수, 25~27.9°C 보통, 22~24.9°C는 조금 추움, 22°C 이하는 수트 필요',
    reliability_note: '얕은 만은 일교차 영향이 커 계절 보정이 중요'
  },
  {
    category: '수중 시야·해파리 위험',
    source: '지역 적조/탁도/수질 통보, 강수 기반 탁수 위험, 수온 기반 해파리 시즌 추정',
    method: '공식 가시거리 실측이 제한되는 구간은 보정 지표로 추정',
    threshold: '가시거리 10m 이상 우수, 5~10m 보통, 5m 미만 불량',
    reliability_note: '실시간 가시거리 공식 제공이 제한되어 불확실성 존재'
  }
];

const WEIGHTS = {
  tides_and_currents: 0.3,
  wind_speed: 0.2,
  wave_height: 0.3,
  visibility_and_precipitation: 0.1,
  water_and_hazards: 0.1,
  early_morning_bonus: 0.12,
  depth_fit_bonus: 0.1
};

const TOTAL_WEIGHT =
  WEIGHTS.tides_and_currents +
  WEIGHTS.wind_speed +
  WEIGHTS.wave_height +
  WEIGHTS.visibility_and_precipitation +
  WEIGHTS.water_and_hazards +
  WEIGHTS.early_morning_bonus +
  WEIGHTS.depth_fit_bonus;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function gradeFromScore(score: number): 'good' | 'normal' | 'bad' {
  if (score >= 0.7) return 'good';
  if (score >= 0.35) return 'normal';
  return 'bad';
}

function scoreFromRange(value: number, good: number, bad: number, reverse = false): number {
  if (!reverse) {
    if (value <= good) return 1;
    if (value >= bad) return 0;
    return clamp(1 - (value - good) / (bad - good));
  }

  if (value >= good) return 1;
  if (value <= bad) return 0;
  return clamp((value - bad) / (good - bad));
}

function scoreWaveHeight(height: number): number {
  if (height <= 0.5) return 1;
  if (height <= 0.8) return 0.6;
  if (height <= 1.0) return 0.25;
  return 0;
}

function scoreWaterTemperature(temperature: number): number {
  if (temperature >= 28 && temperature <= 30) return 1;
  if (temperature >= 25) return 0.5;
  if (temperature > 22) return 0.2;
  return 0;
}

function waterTemperatureRemark(temperature: number): string {
  if (temperature >= 28 && temperature <= 30) return '최적';
  if (temperature > 30) return '조금 더울 수 있음';
  if (temperature > 22) return '조금 추움';
  return '저온구간, 수트 필수 권장';
}

function classifyVisibility(visibility: number): number {
  if (visibility >= 10) return 1;
  if (visibility >= 5) return 0.45;
  return 0;
}

function isFiniteValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function predictMorningClarityBonus(
  datetime: Date,
  precipitation: number,
  wind: number
): number {
  const sunriseHour = 6 + Math.max(-1, Math.min(1, Math.sin((getDayOfYear(datetime) / 365) * Math.PI * 2) * 0.5));
  const hour = datetime.getHours() + datetime.getMinutes() / 60;
  if (hour < sunriseHour - 1 || hour > sunriseHour + 4) return 0;

  const peak = sunriseHour + 1.5;
  const delta = Math.abs(hour - peak);
  const raw = clamp(1 - delta / 2.2);

  let adjusted = raw * (precipitation <= 0.1 ? 1 : 0.25);
  adjusted *= wind >= 6 ? 0.45 : 1;
  return clamp(adjusted);
}

function predictDepthFitScore(
  effectiveDepth: number,
  targetMin: number,
  targetMax: number
): number {
  if (effectiveDepth < targetMin) {
    if (effectiveDepth < 1) return 0;
    const gap = targetMin - effectiveDepth;
    return clamp(1 - gap * 0.35);
  }

  if (effectiveDepth <= targetMax) {
    const center = (targetMin + targetMax) / 2;
    const half = (targetMax - targetMin) / 2;
    const distance = Math.abs(effectiveDepth - center);
    return clamp(1 - distance / half);
  }

  const gap = effectiveDepth - targetMax;
  if (gap > 5) return 0.15;
  return clamp(0.95 - gap * 0.12);
}

function mergeObservedConditions(observed?: ObservedConditionsInput): ConditionSet {
  const observedConfidence = observed?.source_confidence;
  const sources = new Set<string>(observed?.data_sources ?? []);
  if (!sources.size) {
    sources.add('실측 공개 데이터 미수집');
  }

  const merged: ConditionSet = {
    source_confidence: typeof observedConfidence === 'number' ? clamp(observedConfidence, 0, 1) : 0,
    data_sources: Array.from(sources)
  };

  if (observed) {
    if (observed.tide_range !== undefined) merged.tide_range = observed.tide_range;
    if (observed.tide_height !== undefined) merged.tide_height = observed.tide_height;
    if (observed.current_speed !== undefined) merged.current_speed = observed.current_speed;
    if (observed.wind_speed !== undefined) merged.wind_speed = observed.wind_speed;
    if (observed.wave_height !== undefined) merged.wave_height = observed.wave_height;
    if (observed.precipitation !== undefined) merged.precipitation = observed.precipitation;
    if (observed.underwater_visibility !== undefined) merged.underwater_visibility = observed.underwater_visibility;
    if (observed.water_temperature !== undefined) merged.water_temperature = observed.water_temperature;
    if (observed.jellyfish_risk !== undefined) merged.jellyfish_risk = observed.jellyfish_risk;
  }

  return merged;
}

export async function buildRecommendation(
  input: ConditionInput & { targetDepthMin?: number; targetDepthMax?: number },
  observed?: ObservedConditionsInput
): Promise<RecommendationResult> {
  const targetMin = input.targetDepthMin ?? 3;
  const targetMax = input.targetDepthMax ?? 10;
  const dt = new Date(input.datetime);

  const conditions = mergeObservedConditions(observed);

  const tideRange = conditions.tide_range;
  const tideHeight = conditions.tide_height;
  const currentSpeed = conditions.current_speed;
  const windSpeed = conditions.wind_speed;
  const waveHeight = conditions.wave_height;
  const precipitation = conditions.precipitation;
  const visibility = conditions.underwater_visibility;
  const waterTemperature = conditions.water_temperature;

  const tidesCurrentAvailable = isFiniteValue(tideRange) && isFiniteValue(currentSpeed);
  const windAvailable = isFiniteValue(windSpeed);
  const waveAvailable = isFiniteValue(waveHeight);
  const visibilityAvailable = isFiniteValue(visibility);
  const waterAvailable = isFiniteValue(waterTemperature);
  const tideHeightAvailable = isFiniteValue(tideHeight);
  const morningAvailable = isFiniteValue(precipitation) && isFiniteValue(windSpeed);

  const factorList: FactorScore[] = [];
  let weightedScore = 0;
  let weightedWeight = 0;

  const addFactor = (
    key: string,
    label: string,
    score: number,
    weight: number,
    value: number,
    detail: string,
    available = true
  ) => {
    const appliedScore = available ? clamp(score) : 0;
    factorList.push({
      key,
      label,
      value: available ? value : Number.NaN,
      score: appliedScore,
      grade: gradeFromScore(appliedScore),
      weight,
      detail
    });

    if (available) {
      weightedScore += appliedScore * weight;
      weightedWeight += weight;
    }
  };

  const tidesCurrentScore = tidesCurrentAvailable
    ? (scoreFromRange(tideRange, 1.8, 3) + scoreFromRange(currentSpeed, 0.5, 1)) / 2
    : 0;

  addFactor(
    'tides_and_currents',
    '조석·조류',
    tidesCurrentScore,
    WEIGHTS.tides_and_currents,
    tidesCurrentAvailable ? (tideRange || 0) : Number.NaN,
    tidesCurrentAvailable
      ? `조차 ${tideRange.toFixed(2)}m, 조류 ${currentSpeed.toFixed(2)}kt`
      : '조석·조류 실측 데이터 없음',
    tidesCurrentAvailable
  );

  const windScore = windAvailable ? scoreFromRange(windSpeed, 5, 10) : 0;
  addFactor(
    'wind_speed',
    '풍속',
    windScore,
    WEIGHTS.wind_speed,
    windAvailable ? windSpeed : Number.NaN,
    windAvailable ? `풍속 ${windSpeed.toFixed(1)} m/s` : '풍속 실측 데이터 없음',
    windAvailable
  );

  const waveScore = waveAvailable ? scoreWaveHeight(waveHeight) : 0;
  addFactor(
    'wave_height',
    '파고',
    waveScore,
    WEIGHTS.wave_height,
    waveAvailable ? waveHeight : Number.NaN,
    waveAvailable ? `파고 ${waveHeight.toFixed(2)}m` : '파고 실측 데이터 없음',
    waveAvailable
  );

  const visPrecipScore = isFiniteValue(visibility) || isFiniteValue(precipitation)
    ? clamp(classifyVisibility(isFiniteValue(visibility) ? visibility : 0) * (isFiniteValue(precipitation) && precipitation > 5 ? 0.4 : 1))
    : 0;

  const visibilityAndPrecipText =
    visibilityAvailable || isFiniteValue(precipitation)
      ? `가시거리 ${isFiniteValue(visibility) ? `${visibility.toFixed(1)}m` : '정보 없음'}, 강수 ${isFiniteValue(precipitation) ? `${precipitation.toFixed(1)}mm/h` : '정보 없음'}`
      : '수중 가시거리·강수 실측 데이터 없음';
  addFactor(
    'visibility_and_precipitation',
    '가시거리·강수',
    visPrecipScore,
    WEIGHTS.visibility_and_precipitation,
    isFiniteValue(visibility) ? visibility : Number.NaN,
    visibilityAndPrecipText,
    visibilityAvailable || isFiniteValue(precipitation)
  );

  const waterScore = waterAvailable ? scoreWaterTemperature(waterTemperature) : 0;
  addFactor(
    'water_and_hazards',
    '수온·해양생물',
    waterScore,
    WEIGHTS.water_and_hazards,
    waterAvailable ? waterTemperature : Number.NaN,
    waterAvailable
      ? `수온 ${waterTemperature.toFixed(1)}°C (${waterTemperatureRemark(waterTemperature)}), 해파리 위험 데이터 없음`
      : '수온·해양생물 실측 데이터 없음',
    waterAvailable
  );

  const morning = morningAvailable ? predictMorningClarityBonus(dt, precipitation, windSpeed) : 0;
  addFactor(
    'early_morning_bonus',
    '이른 아침 정화 가점',
    morning,
    WEIGHTS.early_morning_bonus,
    morning,
    morningAvailable ? '일출 전후 탁도 저하 반영(강수/강풍 시 감쇠)' : '이른 아침 정화 가중치 산정 데이터 미수집',
    morningAvailable
  );

  const effectiveDepth = isFiniteValue(tideHeight) ? Math.max(1, 6 + tideHeight) : Number.NaN;
  const depthFit = tideHeightAvailable ? predictDepthFitScore(effectiveDepth, targetMin, targetMax) : 0;
  addFactor(
    'depth_fit_bonus',
    '수심 적합도',
    depthFit,
    WEIGHTS.depth_fit_bonus,
    isFiniteValue(effectiveDepth) ? effectiveDepth : Number.NaN,
    tideHeightAvailable
      ? `유효 수심 약 ${effectiveDepth.toFixed(1)}m, 목표 ${targetMin}~${targetMax}m`
      : '수심 적합도 계산을 위한 수위 데이터 없음',
    tideHeightAvailable
  );

  const baseScore = weightedWeight > 0 ? weightedScore / weightedWeight : 0;
  let finalScore = baseScore;
  if (isFiniteValue(precipitation) && precipitation > 5) finalScore *= 0.7;
  if (isFiniteValue(currentSpeed) && currentSpeed > 1.1) finalScore *= 0.7;
  if (isFiniteValue(waveHeight) && waveHeight > 1) finalScore *= 0.8;
  finalScore = clamp(finalScore);

  const dataCompleteness = (() => {
    const keys = [tideRange, currentSpeed, windSpeed, waveHeight, precipitation, visibility, tideHeight, waterTemperature];
    return clamp(keys.filter(isFiniteValue).length / keys.length);
  })();

  const missingSummary = dataCompleteness < 0.5 ? '일부 지표 데이터가 비어 있어 신뢰도에 제한이 있습니다. ' : '';

  const status: RecommendationResult['summary']['status'] =
    finalScore >= 0.7 ? '좋음' : finalScore >= 0.4 ? '보통' : '주의';

  const confidence = clamp((conditions.source_confidence || 0) * 0.55 + dataCompleteness * 0.45);

  const message =
    status === '좋음'
      ? `${missingSummary}현재는 스노클링 진행에 유리한 구간입니다.`
      : status === '보통'
      ? `${missingSummary}조건이 무난하나 바람/파고 변동 시 재확인 필요합니다.`
      : `${missingSummary}주의 구간입니다. 강수·조류·파고 영향이 커 현장 점검이 필요합니다.`;

  return {
    summary: {
      score: Number(finalScore.toFixed(2)),
      status,
      confidence: Number(confidence.toFixed(2)),
      message
    },
    factors: factorList,
    usedSources: conditions.data_sources,
    generatedAt: new Date().toISOString()
  };
}

function pickDayLabel(hour: string) {
  const hourValue = Number(hour.split(':')[0]);
  if (Number.isNaN(hourValue)) return hour;
  if (hourValue < 10) return `${hour} (아침)`;
  if (hourValue < 16) return `${hour} (오후)`;
  return `${hour} (저녁)`;
}

function summarizeStatus(score: number): RecommendationResult['summary']['status'] {
  if (score >= 0.7) return '좋음';
  if (score >= 0.4) return '보통';
  return '주의';
}

export async function buildPeriodRecommendation(
  input: ConditionInput & {
    days: number;
    targetDepthMin?: number;
    targetDepthMax?: number;
  },
  getConditionsAt?: ConditionResolver
): Promise<PeriodRecommendation> {
  const targetMin = input.targetDepthMin ?? 3;
  const targetMax = input.targetDepthMax ?? 10;
  const days = Math.max(1, Math.min(14, Math.floor(input.days || 1)));

  const start = new Date(input.datetime);
  const baseDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const candidateTimes = (() => {
    const times: string[] = [];
    for (let hour = 6; hour <= 17; hour += 1) {
      times.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < 17) times.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return times;
  })();

  const daily: DailyRecommendation[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate.getTime() + i * 86400000);
    const dateString = toLocalDateString(date);

    let best: RecommendationResult | null = null;
    let bestTime = candidateTimes[0];
    const timeSeriesByFactor: FactorTimeSeries = {};

    for (const current of candidateTimes) {
      const datetime = `${dateString}T${current}:00`;
      const observed = getConditionsAt
        ? await Promise.resolve(getConditionsAt(datetime, input.latitude, input.longitude))
        : undefined;

      const result = await buildRecommendation({
        datetime,
        latitude: input.latitude,
        longitude: input.longitude,
        targetDepthMin: targetMin,
        targetDepthMax: targetMax
      }, observed);

      for (const factor of result.factors) {
        if (!Number.isFinite(factor.value)) continue;
        if (!timeSeriesByFactor[factor.key]) {
          timeSeriesByFactor[factor.key] = [];
        }

        timeSeriesByFactor[factor.key].push({
          time: current,
          value: factor.value,
          score: factor.score,
          grade: factor.grade,
          detail: factor.detail
        });
      }

      if (!best || result.summary.score > best.summary.score) {
        best = result;
        bestTime = current;
      }
    }

    if (best) {
      daily.push({
        date: dateString,
        bestTime: pickDayLabel(bestTime),
        summary: {
          score: best.summary.score,
          status: best.summary.status,
          confidence: best.summary.confidence,
          message: best.summary.message
        },
        factors: best.factors,
        timeSeries: timeSeriesByFactor,
        usedSources: best.usedSources
      });
    }
  }

  const periodScore = daily.length ? daily.reduce((acc, day) => acc + day.summary.score, 0) / daily.length : 0;
  const confidence = daily.length ? daily.reduce((acc, day) => acc + day.summary.confidence, 0) / daily.length : 0;
  const status = summarizeStatus(periodScore);

  const aggregateMessage =
    status === '좋음'
      ? '체류 기간 전체적으로 스노클링 적합성이 양호합니다.'
      : status === '보통'
      ? '체류 기간 중 변동 구간이 있어 날짜별 선택이 중요합니다.'
      : '체류 기간의 대부분이 제약 조건이 커 대체 시간대/장소 검토가 필요합니다.';

  const endDate = toLocalDateString(new Date(baseDate.getTime() + (daily.length - 1) * 86400000));

  return {
    period: {
      startDate: toLocalDateString(baseDate),
      days: daily.length,
      endDate
    },
    summary: {
      score: Number(periodScore.toFixed(2)),
      status,
      confidence: Number(confidence.toFixed(2)),
      message: aggregateMessage
    },
    daily,
    dataReferences: DATA_REFERENCE_CATALOG
  };
}
