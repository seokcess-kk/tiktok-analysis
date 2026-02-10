import { NextRequest, NextResponse } from 'next/server';
import { getTikTokAuthUrl } from '@/lib/tiktok/auth';

export async function GET(request: NextRequest) {
  try {
    // state 파라미터로 CSRF 방지 및 리다이렉트 정보 전달
    const state = crypto.randomUUID();

    // 세션 또는 쿠키에 state 저장 (검증용)
    const authUrl = getTikTokAuthUrl(state);

    const response = NextResponse.redirect(authUrl);

    // state를 쿠키에 저장 (콜백에서 검증)
    response.cookies.set('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10분
    });

    return response;
  } catch (error) {
    console.error('TikTok OAuth start error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=oauth_config_error', request.url)
    );
  }
}
