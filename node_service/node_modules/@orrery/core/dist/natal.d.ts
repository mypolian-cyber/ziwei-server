import { AspectType, PlanetId, ZodiacSign, BirthInput, NatalChart } from './types.js';

/**
 * 한국 하계표준시(KDT) 유틸리티
 *
 * 1987~1988년 88올림픽 준비를 위해 시행된 하계표준시(UTC+10) 보정.
 * SwissEph 등 무거운 의존성 없이 saju/ziwei/natal 모두에서 사용 가능.
 */
/** 한국 하계표준시(KDT) 기간인지 판정 (1987~1988 88올림픽) */
declare function isKoreanDaylightTime(year: number, month: number, day: number): boolean;

/**
 * 서양 점성술 Natal Chart 계산 엔진
 *
 * Pure TypeScript ephemeris (Moshier 이론 기반).
 * 외부 데이터 파일이나 WASM 없이 브라우저에서 동기 실행 가능.
 */

declare const ZODIAC_SIGNS: ZodiacSign[];
declare const ZODIAC_SYMBOLS: Record<ZodiacSign, string>;
declare const ZODIAC_KO: Record<ZodiacSign, string>;
declare const PLANET_SYMBOLS: Record<PlanetId, string>;
declare const PLANET_KO: Record<PlanetId, string>;
declare const ASPECT_SYMBOLS: Record<AspectType, string>;
declare const ROMAN: string[];
/** 하우스 시스템: [swisseph char, 표시 이름] */
declare const HOUSE_SYSTEMS: [string, string][];
/** longitude → ZodiacSign */
declare function lonToSign(lon: number): ZodiacSign;
/** 0~360 정규화 (음수 모듈로 처리) */
declare function normalizeDeg(deg: number): number;
/** 도수를 DD°MM' 형식으로 포맷 */
declare function formatDegree(lon: number): string;
declare function calculateNatal(input: BirthInput, houseSystem?: string): Promise<NatalChart>;

export { ASPECT_SYMBOLS, HOUSE_SYSTEMS, PLANET_KO, PLANET_SYMBOLS, ROMAN, ZODIAC_KO, ZODIAC_SIGNS, ZODIAC_SYMBOLS, calculateNatal, formatDegree, isKoreanDaylightTime, lonToSign, normalizeDeg };
