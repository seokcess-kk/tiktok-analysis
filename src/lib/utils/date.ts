/**
 * 날짜 유틸리티 모듈
 *
 * Timezone 처리를 일관되게 관리하여 데이터 정확성 보장
 * - 모든 날짜는 KST (Asia/Seoul) 기준으로 처리
 * - DB 저장/조회 시 UTC 변환 고려
 */

import { format, startOfDay, endOfDay, subDays } from 'date-fns';

// ============================================================
// 상수
// ============================================================

/** 한국 시간대 오프셋 (분) - UTC+9 */
const KST_OFFSET_MINUTES = 9 * 60;

/** 한국 시간대 오프셋 (밀리초) */
const KST_OFFSET_MS = KST_OFFSET_MINUTES * 60 * 1000;

// ============================================================
// 날짜 파싱
// ============================================================

/**
 * 날짜 문자열을 로컬(KST) 자정 Date 객체로 파싱
 *
 * @param dateStr - "2026-02-06" 형식의 날짜 문자열
 * @returns 로컬 자정 기준 Date 객체
 *
 * @example
 * parseLocalDate("2026-02-06")
 * // → Date: 2026-02-06 00:00:00 KST
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }

  // "2026-02-06" 또는 "2026-02-06 14:00:00" 형식 처리
  const datePart = dateStr.split(' ')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.warn(`Invalid date string: ${dateStr}, using current date`);
    return new Date();
  }

  // new Date(year, monthIndex, day) - 로컬 시간대 자정으로 생성
  return new Date(year, month - 1, day);
}

/**
 * TikTok API 응답 날짜를 파싱
 * API는 "2026-02-06 00:00:00" 형식으로 반환 (UTC 추정)
 *
 * @param apiDateStr - TikTok API 날짜 문자열
 * @returns 로컬 날짜 문자열 "2026-02-06"
 */
export function parseTikTokDate(apiDateStr: string): string {
  if (!apiDateStr) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  // TikTok API가 UTC로 반환한다고 가정
  // "2026-02-06 14:00:00" → UTC 기준이므로 KST로 변환 필요
  const datePart = apiDateStr.split(' ')[0];
  const timePart = apiDateStr.split(' ')[1];

  if (!timePart) {
    // 시간 정보 없으면 그대로 반환
    return datePart;
  }

  // UTC 시간을 KST로 변환
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour] = timePart.split(':').map(Number);

  // UTC 시간에 9시간 추가
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour));
  const kstDate = new Date(utcDate.getTime() + KST_OFFSET_MS);

  return format(kstDate, 'yyyy-MM-dd');
}

// ============================================================
// 날짜 포맷팅
// ============================================================

/**
 * Date 객체를 로컬 날짜 문자열로 포맷
 *
 * @param date - Date 객체
 * @returns "2026-02-06" 형식 문자열
 */
export function formatLocalDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Date 객체를 ISO 형식으로 포맷 (timezone 포함)
 *
 * @param date - Date 객체
 * @returns ISO 8601 형식 문자열
 */
export function formatISODate(date: Date): string {
  return date.toISOString();
}

// ============================================================
// 날짜 범위
// ============================================================

/**
 * 쿼리용 날짜 범위 생성
 * 로컬 날짜 범위를 DB 쿼리에 적합한 형태로 변환
 *
 * @param startDate - 시작 날짜 (로컬)
 * @param endDate - 종료 날짜 (로컬)
 * @returns DB 쿼리용 시작/종료 Date 객체
 *
 * @example
 * getDateRangeForQuery(new Date('2026-02-01'), new Date('2026-02-07'))
 * // → { start: 2026-02-01 00:00:00 로컬, end: 2026-02-07 23:59:59 로컬 }
 */
export function getDateRangeForQuery(
  startDate: Date,
  endDate: Date
): { start: Date; end: Date } {
  return {
    start: startOfDay(startDate),
    end: endOfDay(endDate),
  };
}

/**
 * 프리셋 기반 날짜 범위 생성
 *
 * @param preset - 'today' | '7d' | '14d' | '30d' | '90d'
 * @returns 시작/종료 날짜
 */
export function getPresetDateRange(preset: string): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (preset) {
    case 'today':
      start = startOfDay(end);
      break;
    case '7d':
      start = startOfDay(subDays(end, 6)); // 오늘 포함 7일
      break;
    case '14d':
      start = startOfDay(subDays(end, 13));
      break;
    case '30d':
      start = startOfDay(subDays(end, 29));
      break;
    case '90d':
      start = startOfDay(subDays(end, 89));
      break;
    default:
      start = startOfDay(subDays(end, 6));
  }

  return { start, end: endOfDay(end) };
}

// ============================================================
// 날짜 비교
// ============================================================

/**
 * 두 날짜가 같은 날인지 비교 (로컬 기준)
 */
export function isSameLocalDate(date1: Date, date2: Date): boolean {
  return formatLocalDate(date1) === formatLocalDate(date2);
}

/**
 * 날짜가 범위 내에 있는지 확인
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const dateTime = date.getTime();
  return dateTime >= start.getTime() && dateTime <= end.getTime();
}

// ============================================================
// 유틸리티
// ============================================================

/**
 * 날짜 문자열 검증
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = parseLocalDate(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 오늘 날짜 문자열 반환
 */
export function getTodayString(): string {
  return formatLocalDate(new Date());
}

/**
 * N일 전 날짜 문자열 반환
 */
export function getDaysAgoString(days: number): string {
  return formatLocalDate(subDays(new Date(), days));
}
