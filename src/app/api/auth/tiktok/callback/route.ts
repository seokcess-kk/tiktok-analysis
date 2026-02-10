import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/tiktok/auth';
import prisma from '@/lib/db/prisma';
import { Account } from '@prisma/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get('auth_code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 에러 처리
  if (error) {
    console.error('TikTok OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // 인증 코드 확인
  if (!authCode) {
    return NextResponse.redirect(
      new URL('/accounts?error=no_auth_code', request.url)
    );
  }

  // state 검증 (CSRF 방지)
  const storedState = request.cookies.get('tiktok_oauth_state')?.value;
  if (state && storedState && state !== storedState) {
    return NextResponse.redirect(
      new URL('/accounts?error=state_mismatch', request.url)
    );
  }

  try {
    // 인증 코드로 access token 교환
    const tokenData = await exchangeCodeForToken(authCode);

    const { access_token, advertiser_ids } = tokenData;

    if (!advertiser_ids || advertiser_ids.length === 0) {
      return NextResponse.redirect(
        new URL('/accounts?error=no_advertiser', request.url)
      );
    }

    // 각 광고주 계정 등록
    const createdAccounts: Account[] = [];

    for (const advertiserId of advertiser_ids) {
      // 이미 등록된 계정인지 확인
      const existingAccount = await prisma.account.findUnique({
        where: { tiktokAdvId: advertiserId },
      });

      if (existingAccount) {
        // 토큰 업데이트
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: access_token,
            refreshToken: access_token, // TikTok은 refresh token이 따로 없음
            tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간
            status: 'ACTIVE',
          },
        });
        createdAccounts.push(existingAccount);
        continue;
      }

      // 기본 클라이언트 생성 또는 조회
      let client = await prisma.client.findFirst({
        where: { name: 'TikTok Ads' },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: 'TikTok Ads',
            industry: '광고',
          },
        });
      }

      // 새 계정 생성
      const account = await prisma.account.create({
        data: {
          clientId: client.id,
          tiktokAdvId: advertiserId,
          name: `TikTok Advertiser ${advertiserId.slice(-6)}`,
          accessToken: access_token,
          refreshToken: access_token,
          tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });

      createdAccounts.push(account);
    }

    // 성공 리다이렉트
    const response = NextResponse.redirect(
      new URL(
        `/accounts?success=true&count=${createdAccounts.length}`,
        request.url
      )
    );

    // state 쿠키 삭제
    response.cookies.delete('tiktok_oauth_state');

    return response;
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
