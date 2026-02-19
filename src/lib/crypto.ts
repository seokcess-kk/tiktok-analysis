/**
 * 암호화 모듈
 *
 * OAuth 토큰 등 민감한 데이터의 암호화/복호화를 담당합니다.
 * AES-256-GCM 알고리즘 사용
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================
// 상수
// ============================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;        // 초기화 벡터 길이
const TAG_LENGTH = 16;       // 인증 태그 길이
const KEY_LENGTH = 32;       // 256비트 키

// ============================================================
// 키 관리
// ============================================================

/**
 * 암호화 키 가져오기
 * 환경 변수에서 64자리 hex 문자열 (32바이트)을 읽음
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;

  // 키가 설정되지 않은 경우 암호화 비활성화
  if (!key) {
    throw new EncryptionKeyNotSetError();
  }

  // 키 형식 검증 (64자리 hex = 32바이트)
  if (key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key)) {
    throw new InvalidEncryptionKeyError();
  }

  return Buffer.from(key, 'hex');
}

/**
 * 암호화 키 설정 여부 확인
 */
export function isEncryptionEnabled(): boolean {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  return !!key && key.length === 64 && /^[0-9a-fA-F]+$/.test(key);
}

// ============================================================
// 에러 클래스
// ============================================================

export class EncryptionKeyNotSetError extends Error {
  constructor() {
    super('TOKEN_ENCRYPTION_KEY environment variable is not set');
    this.name = 'EncryptionKeyNotSetError';
  }
}

export class InvalidEncryptionKeyError extends Error {
  constructor() {
    super('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    this.name = 'InvalidEncryptionKeyError';
  }
}

export class DecryptionError extends Error {
  constructor(message = 'Failed to decrypt data') {
    super(message);
    this.name = 'DecryptionError';
  }
}

// ============================================================
// 암호화/복호화
// ============================================================

/**
 * 문자열 암호화
 *
 * @param plaintext 암호화할 평문
 * @returns iv:tag:ciphertext 형식의 암호화된 문자열
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // iv:tag:encrypted 형식으로 저장
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 암호화된 문자열 복호화
 *
 * @param encrypted iv:tag:ciphertext 형식의 암호화된 문자열
 * @returns 복호화된 평문
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new DecryptionError('Invalid encrypted format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new DecryptionError('Failed to decrypt: data may be corrupted or key mismatch');
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

/**
 * 문자열이 암호화된 형식인지 확인
 * iv:tag:ciphertext 형식 (각각 32:32:n 자리 hex)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [iv, tag] = parts;

  // IV는 32자 (16바이트), Tag는 32자 (16바이트) hex
  return iv.length === 32 && tag.length === 32 &&
    /^[0-9a-fA-F]+$/.test(iv) && /^[0-9a-fA-F]+$/.test(tag);
}

/**
 * 토큰 암호화 (암호화 비활성화 시 원본 반환)
 */
export function encryptToken(token: string): string {
  if (!isEncryptionEnabled()) {
    console.warn('[Crypto] Encryption disabled: TOKEN_ENCRYPTION_KEY not set');
    return token;
  }
  return encrypt(token);
}

/**
 * 토큰 복호화 (암호화되지 않은 경우 원본 반환)
 */
export function decryptToken(token: string): string {
  if (!isEncrypted(token)) {
    return token;
  }

  if (!isEncryptionEnabled()) {
    console.warn('[Crypto] Cannot decrypt: TOKEN_ENCRYPTION_KEY not set');
    return token;
  }

  return decrypt(token);
}

/**
 * 암호화 키 생성 (설정용)
 * 새 프로젝트 설정 시 사용
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
