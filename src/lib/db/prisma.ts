import { PrismaClient } from '@prisma/client';

// ============================================================
// 소프트 삭제 대상 모델 목록
// ============================================================

const SOFT_DELETE_MODELS = [
  'Account',
  'Campaign',
  'AdGroup',
  'Ad',
  'Creative',
] as const;

type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDeleteModel(model: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

// ============================================================
// Prisma 클라이언트 생성
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // ============================================================
  // 소프트 삭제 미들웨어
  // ============================================================

  // 1. delete → update(deletedAt) 변환
  client.$use(async (params, next) => {
    if (params.model && isSoftDeleteModel(params.model)) {
      // delete를 soft delete로 변환
      if (params.action === 'delete') {
        params.action = 'update';
        params.args['data'] = { deletedAt: new Date() };
      }

      // deleteMany를 soft delete로 변환
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data !== undefined) {
          params.args.data['deletedAt'] = new Date();
        } else {
          params.args['data'] = { deletedAt: new Date() };
        }
      }
    }
    return next(params);
  });

  // 2. find 쿼리에서 삭제된 레코드 제외
  client.$use(async (params, next) => {
    if (params.model && isSoftDeleteModel(params.model)) {
      const findActions = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];

      if (findActions.includes(params.action)) {
        // where 조건에 deletedAt: null 추가 (명시적으로 삭제된 것도 조회하는 경우 제외)
        if (params.args?.where) {
          // 이미 deletedAt 조건이 있으면 덮어쓰지 않음
          if (params.args.where.deletedAt === undefined) {
            params.args.where = {
              ...params.args.where,
              deletedAt: null,
            };
          }
        } else {
          params.args = {
            ...params.args,
            where: { deletedAt: null },
          };
        }
      }

      // update/updateMany도 삭제된 레코드 제외
      if (params.action === 'update' || params.action === 'updateMany') {
        if (params.args?.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where = {
              ...params.args.where,
              deletedAt: null,
            };
          }
        }
      }
    }
    return next(params);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// ============================================================
// 소프트 삭제 헬퍼 함수
// ============================================================

/**
 * 소프트 삭제된 레코드 포함 조회 옵션
 * 사용법: prisma.account.findMany({ where: { ...withDeleted() } })
 */
export function withDeleted() {
  return { deletedAt: undefined } as const;
}

/**
 * 소프트 삭제된 레코드만 조회 옵션
 * 사용법: prisma.account.findMany({ where: { ...onlyDeleted() } })
 */
export function onlyDeleted() {
  return { deletedAt: { not: null } } as const;
}

/**
 * 소프트 삭제된 레코드 복구 (Account)
 */
export async function restoreAccount(id: string): Promise<void> {
  await prisma.account.update({
    where: { id, ...onlyDeleted() },
    data: { deletedAt: null },
  });
}

/**
 * 소프트 삭제된 레코드 복구 (Campaign)
 */
export async function restoreCampaign(id: string): Promise<void> {
  await prisma.campaign.update({
    where: { id, ...onlyDeleted() },
    data: { deletedAt: null },
  });
}

/**
 * 소프트 삭제된 레코드 복구 (AdGroup)
 */
export async function restoreAdGroup(id: string): Promise<void> {
  await prisma.adGroup.update({
    where: { id, ...onlyDeleted() },
    data: { deletedAt: null },
  });
}

/**
 * 소프트 삭제된 레코드 복구 (Ad)
 */
export async function restoreAd(id: string): Promise<void> {
  await prisma.ad.update({
    where: { id, ...onlyDeleted() },
    data: { deletedAt: null },
  });
}

/**
 * 소프트 삭제된 레코드 복구 (Creative)
 */
export async function restoreCreative(id: string): Promise<void> {
  await prisma.creative.update({
    where: { id, ...onlyDeleted() },
    data: { deletedAt: null },
  });
}
