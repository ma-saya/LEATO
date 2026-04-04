import { createAdminClient } from "@/lib/supabase/admin";

export type AIPlan = "free" | "pro" | "unlimited" | string;

export type AIQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  plan: AIPlan;
};

export type ConsumeDailyQuotaResult = AIQuota & {
  allowed: boolean;
};

type QuotaRpcRow = {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
  reset_at: string;
  plan: AIPlan;
};

const DEFAULT_PLAN: AIPlan = "free";
const UNLIMITED_DAILY_LIMIT = 2147483647;

export function getDailyLimitByPlan(plan: AIPlan): number {
  switch (plan) {
    case "pro":
      return 100;
    case "unlimited":
      return UNLIMITED_DAILY_LIMIT;
    case "free":
    default:
      return 10;
  }
}

export function getTodayKeyUTC(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getNextResetAtUTC(usageDate = getTodayKeyUTC()): string {
  const baseDate = new Date(`${usageDate}T00:00:00.000Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  return baseDate.toISOString();
}

function normalizeQuotaRow(row: Partial<QuotaRpcRow> | null | undefined): AIQuota {
  const plan = row?.plan ?? DEFAULT_PLAN;
  const limit = row?.limit ?? getDailyLimitByPlan(plan);
  const used = row?.used ?? 0;
  const remaining = row?.remaining ?? Math.max(limit - used, 0);
  const resetAt = row?.reset_at ?? getNextResetAtUTC();

  return {
    limit,
    used,
    remaining,
    resetAt,
    plan,
  };
}

export async function getDailyQuotaSnapshot(userId: string): Promise<AIQuota> {
  const admin = createAdminClient();
  const usageDate = getTodayKeyUTC();

  const { data, error } = await admin
    .from("ai_usage_daily")
    .select("request_count, plan")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch AI quota snapshot: ${error.message}`);
  }

  const plan = data?.plan ?? DEFAULT_PLAN;
  const limit = getDailyLimitByPlan(plan);
  const used = data?.request_count ?? 0;

  return {
    plan,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    resetAt: getNextResetAtUTC(usageDate),
  };
}

export async function consumeDailyQuota(
  userId: string,
): Promise<ConsumeDailyQuotaResult> {
  const admin = createAdminClient();
  const usageDate = getTodayKeyUTC();

  const { data, error } = await admin.rpc("consume_ai_daily_quota", {
    p_user_id: userId,
    p_usage_date: usageDate,
    p_default_plan: DEFAULT_PLAN,
    p_increment: 1,
  });

  if (error) {
    throw new Error(`Failed to consume AI quota: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const quota = normalizeQuotaRow(row);

  return {
    allowed: Boolean(row?.allowed),
    ...quota,
  };
}
