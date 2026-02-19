/**
 * 상태 정규화 유틸리티 모듈
 *
 * TikTok API의 다양한 상태 값을 내부 표준 상태로 정규화
 * 일관된 상태 표시를 위한 레이블 및 스타일 제공
 */

// ============================================================
// 타입 정의
// ============================================================

/** 정규화된 상태 타입 */
export type NormalizedStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'PENDING' | 'UNKNOWN';

/** 상태 관련 UI 정보 */
export interface StatusInfo {
  status: NormalizedStatus;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
  description: string;
}

// ============================================================
// 상태 매핑
// ============================================================

/**
 * TikTok API 상태값 → 내부 표준 상태 매핑
 *
 * TikTok API는 다양한 상태 값을 반환할 수 있음:
 * - Campaign: ENABLE, DISABLE, DELETE
 * - AdGroup: ENABLE, DISABLE, DELETE, CAMPAIGN_STATUS_DELETE
 * - Ad: ENABLE, DISABLE, DELETE
 *
 * 추가로 발견되는 상태값이 있으면 여기에 추가
 */
const STATUS_MAP: Record<string, NormalizedStatus> = {
  // 활성 상태
  ENABLE: 'ACTIVE',
  ACTIVE: 'ACTIVE',
  RUNNING: 'ACTIVE',
  LIVE: 'ACTIVE',
  OPERATE: 'ACTIVE',
  DELIVERY_OK: 'ACTIVE',
  STATUS_ENABLE: 'ACTIVE',

  // 일시정지 상태
  DISABLE: 'PAUSED',
  PAUSED: 'PAUSED',
  PAUSE: 'PAUSED',
  INACTIVE: 'PAUSED',
  SUSPENDED: 'PAUSED',
  NOT_DELIVER: 'PAUSED',
  STATUS_DISABLE: 'PAUSED',

  // 삭제 상태
  DELETE: 'DELETED',
  DELETED: 'DELETED',
  REMOVED: 'DELETED',
  CAMPAIGN_STATUS_DELETE: 'DELETED',
  ADGROUP_STATUS_DELETE: 'DELETED',
  STATUS_DELETE: 'DELETED',

  // 대기 상태
  PENDING: 'PENDING',
  PENDING_REVIEW: 'PENDING',
  IN_REVIEW: 'PENDING',
  DRAFT: 'PENDING',
  NOT_STARTED: 'PENDING',
  SCHEDULED: 'PENDING',
  PREACTIVE: 'PENDING',
};

/**
 * 상태별 UI 정보
 */
const STATUS_INFO: Record<NormalizedStatus, Omit<StatusInfo, 'status'>> = {
  ACTIVE: {
    label: '운영중',
    variant: 'default',
    color: 'green',
    description: '광고가 정상적으로 운영 중입니다',
  },
  PAUSED: {
    label: '일시정지',
    variant: 'secondary',
    color: 'yellow',
    description: '광고가 일시정지 상태입니다',
  },
  DELETED: {
    label: '삭제됨',
    variant: 'destructive',
    color: 'red',
    description: '광고가 삭제되었습니다',
  },
  PENDING: {
    label: '대기중',
    variant: 'outline',
    color: 'blue',
    description: '광고가 검토 중이거나 시작 대기 중입니다',
  },
  UNKNOWN: {
    label: '알 수 없음',
    variant: 'outline',
    color: 'gray',
    description: '상태를 확인할 수 없습니다',
  },
};

// ============================================================
// 주요 함수
// ============================================================

/**
 * API 상태값을 내부 표준 상태로 정규화
 *
 * @param rawStatus - TikTok API에서 반환된 상태 문자열
 * @returns 정규화된 상태
 *
 * @example
 * normalizeStatus('ENABLE')  // → 'ACTIVE'
 * normalizeStatus('DISABLE') // → 'PAUSED'
 * normalizeStatus('UNKNOWN_VALUE') // → 'UNKNOWN'
 */
export function normalizeStatus(rawStatus: string | null | undefined): NormalizedStatus {
  if (!rawStatus) {
    return 'UNKNOWN';
  }

  const upperStatus = rawStatus.toUpperCase().trim();
  return STATUS_MAP[upperStatus] || 'UNKNOWN';
}

/**
 * 상태에 대한 한글 레이블 반환
 *
 * @param status - 정규화된 상태 또는 원본 상태
 * @returns 한글 상태 레이블
 */
export function getStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeStatus(status);
  return STATUS_INFO[normalized].label;
}

/**
 * 상태에 대한 Badge variant 반환
 *
 * @param status - 정규화된 상태 또는 원본 상태
 * @returns shadcn Badge variant
 */
export function getStatusVariant(
  status: string | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = normalizeStatus(status);
  return STATUS_INFO[normalized].variant;
}

/**
 * 상태에 대한 전체 UI 정보 반환
 *
 * @param status - 정규화된 상태 또는 원본 상태
 * @returns StatusInfo 객체
 */
export function getStatusInfo(status: string | null | undefined): StatusInfo {
  const normalized = normalizeStatus(status);
  return {
    status: normalized,
    ...STATUS_INFO[normalized],
  };
}

/**
 * 상태가 활성 상태인지 확인
 */
export function isActiveStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'ACTIVE';
}

/**
 * 상태가 비활성 상태인지 확인 (일시정지, 삭제, 대기 등)
 */
export function isInactiveStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return normalized !== 'ACTIVE';
}

/**
 * 원본 상태값 → 정규화된 상태로 변환 (저장용)
 * DB에 저장할 때 일관된 상태값 사용
 */
export function toStorableStatus(rawStatus: string | null | undefined): string {
  return normalizeStatus(rawStatus);
}

// ============================================================
// 배치 처리
// ============================================================

/**
 * 여러 엔티티의 상태를 일괄 정규화
 */
export function normalizeStatuses<T extends { status?: string | null }>(
  items: T[]
): (T & { normalizedStatus: NormalizedStatus })[] {
  return items.map((item) => ({
    ...item,
    normalizedStatus: normalizeStatus(item.status),
  }));
}

/**
 * 상태별 그룹화
 */
export function groupByStatus<T extends { status?: string | null }>(
  items: T[]
): Record<NormalizedStatus, T[]> {
  const result: Record<NormalizedStatus, T[]> = {
    ACTIVE: [],
    PAUSED: [],
    DELETED: [],
    PENDING: [],
    UNKNOWN: [],
  };

  for (const item of items) {
    const normalized = normalizeStatus(item.status);
    result[normalized].push(item);
  }

  return result;
}

/**
 * 상태별 개수 집계
 */
export function countByStatus<T extends { status?: string | null }>(
  items: T[]
): Record<NormalizedStatus, number> {
  const groups = groupByStatus(items);
  return {
    ACTIVE: groups.ACTIVE.length,
    PAUSED: groups.PAUSED.length,
    DELETED: groups.DELETED.length,
    PENDING: groups.PENDING.length,
    UNKNOWN: groups.UNKNOWN.length,
  };
}
