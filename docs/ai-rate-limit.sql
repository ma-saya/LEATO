create extension if not exists pgcrypto;

create table if not exists public.ai_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  usage_date date not null,
  request_count int not null default 0,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_usage_daily_user_date_unique unique (user_id, usage_date),
  constraint ai_usage_daily_request_count_nonneg check (request_count >= 0)
);

create index if not exists idx_ai_usage_daily_date
  on public.ai_usage_daily (usage_date);

create index if not exists idx_ai_usage_daily_user_date
  on public.ai_usage_daily (user_id, usage_date);

alter table public.ai_usage_daily enable row level security;

create or replace function public.consume_ai_daily_quota(
  p_user_id uuid,
  p_usage_date date,
  p_default_plan text default 'free',
  p_increment int default 1
)
returns table (
  allowed boolean,
  used int,
  remaining int,
  "limit" int,
  reset_at timestamptz,
  plan text
)
language plpgsql
as $$
declare
  v_plan text;
  v_used int;
  v_limit int;
begin
  insert into public.ai_usage_daily (user_id, usage_date, request_count, plan)
  values (p_user_id, p_usage_date, 0, coalesce(p_default_plan, 'free'))
  on conflict (user_id, usage_date) do nothing;

  update public.ai_usage_daily
  set
    request_count = request_count + greatest(p_increment, 1),
    updated_at = now()
  where user_id = p_user_id
    and usage_date = p_usage_date
    and request_count + greatest(p_increment, 1) <= case plan
      when 'pro' then 100
      when 'unlimited' then 2147483647
      else 10
    end
  returning
    ai_usage_daily.plan,
    ai_usage_daily.request_count,
    case ai_usage_daily.plan
      when 'pro' then 100
      when 'unlimited' then 2147483647
      else 10
    end
  into v_plan, v_used, v_limit;

  if found then
    allowed := true;
    used := v_used;
    remaining := greatest(v_limit - v_used, 0);
    "limit" := v_limit;
    reset_at := ((p_usage_date + 1)::text || ' 00:00:00+00')::timestamptz;
    plan := v_plan;
    return next;
    return;
  end if;

  select
    ai_usage_daily.plan,
    ai_usage_daily.request_count,
    case ai_usage_daily.plan
      when 'pro' then 100
      when 'unlimited' then 2147483647
      else 10
    end
  into v_plan, v_used, v_limit
  from public.ai_usage_daily
  where user_id = p_user_id
    and usage_date = p_usage_date;

  allowed := false;
  used := coalesce(v_used, 0);
  "limit" := coalesce(v_limit, 10);
  remaining := greatest("limit" - used, 0);
  reset_at := ((p_usage_date + 1)::text || ' 00:00:00+00')::timestamptz;
  plan := coalesce(v_plan, coalesce(p_default_plan, 'free'));
  return next;
end;
$$;
