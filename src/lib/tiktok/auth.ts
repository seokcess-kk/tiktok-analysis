const TIKTOK_AUTH_BASE = 'https://business-api.tiktok.com/open_api/v1.3/oauth2';

interface TikTokTokenResponse {
  access_token: string;
  advertiser_ids: string[];
  scope: number;
  token_type: string;
  expires_in?: number; // 토큰 만료 시간 (초)
}

interface TikTokRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope: number;
  token_type: string;
}

export function getTikTokAuthUrl(state?: string): string {
  const appId = process.env.TIKTOK_APP_ID;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!appId || !redirectUri) {
    throw new Error('TikTok OAuth configuration missing');
  }

  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state: state || '',
  });

  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

export async function exchangeCodeForToken(
  authCode: string
): Promise<TikTokTokenResponse> {
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('TikTok OAuth configuration missing');
  }

  const response = await fetch(`${TIKTOK_AUTH_BASE}/access_token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      secret: appSecret,
      auth_code: authCode,
    }),
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`TikTok OAuth Error: ${data.code} - ${data.message}`);
  }

  return data.data;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TikTokRefreshResponse> {
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('TikTok OAuth configuration missing');
  }

  const response = await fetch(`${TIKTOK_AUTH_BASE}/refresh_token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      secret: appSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`TikTok Token Refresh Error: ${data.code} - ${data.message}`);
  }

  return data.data;
}

export function isTokenExpired(expiresAt: Date): boolean {
  // 만료 5분 전부터 갱신 필요로 판단
  const bufferMs = 5 * 60 * 1000;
  return new Date().getTime() > expiresAt.getTime() - bufferMs;
}
