# 워크스페이스 데이터 격리 계획 (Phase 18+)

> ⚠️ **이 문서는 계획만 — 실행 전 사용자 승인 필수.** 운영 DB 변경 + 코드 다수 수정 + 데이터 마이그레이션이 동반됩니다.

## 현재 상태 (Phase 17 까지)

- `MarketingChannel`, `Campaign`, `CampaignSeries`, `AgentInstance` 등은 모두 **`userId` 컬럼만** 가짐
- `User.currentWorkspaceId` 만 변경되고, 실제 데이터 조회 시 워크스페이스로 필터링되지 않음
- 결과: 파트너가 "이 고객사로 작업하기" 눌러도 동일한 채널·캠페인 목록이 보임 → 격리 미작동

## 목표

1. **워크스페이스별 데이터 격리** — 채널/캠페인/시리즈를 워크스페이스 단위로 분리
2. 기존 데이터 보존 — null workspaceId 는 사용자 개인 작업으로 취급
3. 점진적 마이그레이션 — 사용자가 모르는 사이 깨지지 않도록

## 영향 범위

### 1. Prisma 스키마 변경 (4개 모델)

```prisma
model MarketingChannel {
  // ... 기존 필드 ...
  workspaceId String?               // 추가 — null = 사용자 개인
  workspace   Workspace? @relation(...)
  @@index([workspaceId])
}

model Campaign {
  // ... 기존 필드 ...
  workspaceId String?
  workspace   Workspace? @relation(...)
  @@index([workspaceId])
}

model CampaignSeries {
  // ... 기존 필드 ...
  workspaceId String?
  workspace   Workspace? @relation(...)
  @@index([workspaceId])
}

model AgentInstance {
  // ... 기존 필드 ...
  workspaceId String?
  workspace   Workspace? @relation(...)
  @@index([workspaceId])
}
```

### 2. 마이그레이션 SQL (additive)

```sql
ALTER TABLE "MarketingChannel" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "CampaignSeries" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
ALTER TABLE "AgentInstance" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

CREATE INDEX IF NOT EXISTS "MarketingChannel_workspaceId_idx" ON "MarketingChannel"("workspaceId");
CREATE INDEX IF NOT EXISTS "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");
CREATE INDEX IF NOT EXISTS "CampaignSeries_workspaceId_idx" ON "CampaignSeries"("workspaceId");
CREATE INDEX IF NOT EXISTS "AgentInstance_workspaceId_idx" ON "AgentInstance"("workspaceId");

-- (FK 제약은 추후 분리 마이그레이션으로)
```

### 3. 서버 액션 헬퍼 추가

```ts
// src/lib/workspace/scope.ts
export async function getActiveWorkspaceFilter(userId: string): Promise<{
  userId: string;
  workspaceId: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentWorkspaceId: true },
  });
  // currentWorkspaceId 가 있으면 그 워크스페이스 데이터만, 없으면 워크스페이스 없는(개인) 데이터만
  return {
    userId,
    workspaceId: user?.currentWorkspaceId ?? null,
  };
}
```

### 4. 영향받는 server actions (수정 필요한 파일들)

| 파일 | 영향 | 변경 작업 |
|---|---|---|
| `actions/channelActions.ts` | listChannels, createChannel | userId + workspaceId 필터/저장 |
| `actions/campaignActions.ts` | listCampaigns, createCampaign | userId + workspaceId |
| `actions/seriesActions.ts` | listSeries, createSeries, processSeriesOnce | userId + workspaceId |
| `actions/agentActions.ts` | listAgents, createAgent | userId + workspaceId |
| `actions/copilotActions.ts` | 컨텍스트 조회 | workspaceId 인지 |
| `api/cron/dispatch-series/route.ts` | 시리즈 처리 | workspaceId 보존 |
| `api/cron/dispatch-cloud-publishers/route.ts` | task 디스패치 | 영향 없음 (taskId 직접 처리) |
| `api/webhook/[token]/publish/route.ts` | 외부 트리거 | 토큰 발급 시 workspaceId 정해야 함 |

### 5. 데이터 마이그레이션 정책

**Option A — 보수적 (권장)**:
- 기존 데이터의 workspaceId 는 모두 NULL 로 둠 (사용자 개인 작업)
- 새 데이터만 사용자의 currentWorkspaceId 따라 저장
- 사용자가 명시적으로 "워크스페이스로 옮기기" 액션 사용 시 이전

**Option B — 자동**:
- 사용자별 기본 워크스페이스 자동 생성 (없으면) → 모든 기존 데이터를 그 워크스페이스로 이전
- 위험: 채널/캠페인이 워크스페이스 컨텍스트에서만 보이게 되어 사용자 혼란 가능

→ **Option A 채택**.

## 단계별 실행 (5단계)

### Phase 18-1. 스키마 + 마이그레이션 (additive)
- 4개 모델에 workspaceId nullable 컬럼 추가
- 인덱스 생성
- DB 적용 → 기존 데이터 영향 0

### Phase 18-2. 헬퍼 + 새 데이터 저장
- `getActiveWorkspaceFilter()` 추가
- `createChannel`, `createCampaign`, `createSeries` 등에서 currentWorkspaceId 자동 저장
- 기존 데이터는 그대로 (workspaceId = null)

### Phase 18-3. 조회 필터링
- `list*` 서버 액션을 `getActiveWorkspaceFilter()` 결과로 분기
- workspaceId IS NULL → 개인 작업 컨텍스트
- workspaceId = X → 그 워크스페이스 컨텍스트

### Phase 18-4. UI 인디케이터
- 워크스페이스 컨텍스트 활성 시 시각적 표시 (현재 헤더 스위처 + 페이지 상단 배너)
- 캠페인 작성 시 "이 캠페인은 [워크스페이스명] 에 저장됩니다" 안내

### Phase 18-5. 데이터 이동 도구 (선택)
- 사용자가 기존 개인 데이터를 워크스페이스로 일괄 이동할 수 있는 UI
- 채널/캠페인 다중 선택 → "워크스페이스 변경"

## 위험 요소

| 위험 | 완화 |
|---|---|
| 기존 사용자가 갑자기 데이터 안 보임 | Option A — null 유지로 호환성 |
| cron 이 잘못된 워크스페이스 처리 | 시리즈/캠페인의 workspaceId 를 task 생성 시 보존 |
| 외부 webhook 이 어디로 저장? | webhook 토큰 발급 시 workspaceId 지정 (현재는 user 기준 → 토큰별 workspaceId 추가) |
| 결제·구독은 user 단위인데 데이터는 workspace 단위 | 향후 Workspace.subscription 으로 이전 검토 (별도 phase) |

## 일정 견적

| 단계 | 소요 |
|---|---|
| 18-1 스키마 + DB 적용 | 1시간 |
| 18-2 헬퍼 + 저장 로직 | 2-3시간 |
| 18-3 조회 필터링 (모든 server action) | 4-6시간 |
| 18-4 UI 인디케이터 | 1-2시간 |
| 18-5 데이터 이동 도구 (선택) | 4시간 |
| **합계** | **1-2일** |

## 결정 사항 (사용자 컨펌 필요)

- [ ] Option A (보수적) 로 진행 OK?
- [ ] Phase 18-1 ~ 18-3 까지 한 번에 할지, 단계별로 할지?
- [ ] Workspace.subscription 분리는 별도 Phase 로 할지?
- [ ] 기존 데이터 자동 이동 옵션 (18-5) 필요한지?
