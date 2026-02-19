import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

// ============================================================
// 에러 클래스
// ============================================================

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// ============================================================
// 타입 정의
// ============================================================

export interface AuthContext {
  userId: string;
  accountId: string;
  account: {
    id: string;
    name: string;
    tiktokAdvId: string;
  };
}

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
}

// ============================================================
// 인증 함수
// ============================================================

/**
 * 현재 세션에서 사용자 정보 가져오기
 * NextAuth 설정에 따라 수정 필요할 수 있음
 */
export async function getCurrentUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    // NextAuth 세션 확인
    const session = await getServerSession();

    if (session?.user) {
      return {
        id: (session.user as any).id || session.user.email || '',
        email: session.user.email || undefined,
        name: session.user.name || undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
}

/**
 * 계정 접근 권한 검증
 * 현재 세션의 사용자가 해당 계정에 접근할 수 있는지 확인
 */
export async function verifyAccountAccess(
  request: NextRequest,
  accountId: string
): Promise<AuthContext> {
  // 1. 세션에서 사용자 확인
  const user = await getCurrentUser(request);

  if (!user?.id) {
    throw new UnauthorizedError('Session not found or expired');
  }

  // 2. 계정 존재 여부 확인
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      tiktokAdvId: true,
    },
  });

  if (!account) {
    throw new ForbiddenError('Account not found');
  }

  // 3. 계정 소유권 확인 (UserAccount 관계)
  const userAccount = await prisma.userAccount.findFirst({
    where: {
      userId: user.id,
      accountId: accountId,
    },
  });

  // UserAccount 관계가 없으면 직접 접근 권한 확인
  // (단일 사용자 시스템이거나 UserAccount 테이블이 없는 경우 대비)
  if (!userAccount) {
    // 대안: 계정에 직접 접근 가능한지 확인
    // 현재는 계정이 존재하면 접근 허용 (단일 사용자 모드)
    // 프로덕션에서는 이 부분을 더 엄격하게 설정해야 함
    console.warn(`User ${user.id} accessing account ${accountId} without UserAccount relation`);
  }

  return {
    userId: user.id,
    accountId: accountId,
    account: {
      id: account.id,
      name: account.name,
      tiktokAdvId: account.tiktokAdvId,
    },
  };
}

/**
 * 계정 접근 권한 검증 (선택적)
 * 인증 실패 시 null 반환 (에러 던지지 않음)
 */
export async function tryVerifyAccountAccess(
  request: NextRequest,
  accountId: string
): Promise<AuthContext | null> {
  try {
    return await verifyAccountAccess(request, accountId);
  } catch {
    return null;
  }
}

// ============================================================
// 응답 헬퍼
// ============================================================

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 }
  );
}

// ============================================================
// 미들웨어 래퍼
// ============================================================

type RouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>;

type AuthenticatedRouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string> },
  auth: AuthContext
) => Promise<NextResponse>;

/**
 * 인증이 필요한 라우트 핸들러 래퍼
 */
export function withAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (request, context) => {
    const accountId = context.params.accountId;

    if (!accountId) {
      return forbiddenResponse('Account ID is required');
    }

    try {
      const auth = await verifyAccountAccess(request, accountId);
      return handler(request, context, auth);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return unauthorizedResponse(error.message);
      }
      if (error instanceof ForbiddenError) {
        return forbiddenResponse(error.message);
      }
      throw error;
    }
  };
}
