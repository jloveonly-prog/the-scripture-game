-- 0001_init.sql — Postgres 5테이블·인덱스·leaderboard 뷰·RLS 전면 거부·create_guest·record_match 함수 정의만
-- TASK-002 | REQ-014 REQ-015 REQ-016 FR-012 FR-067 FR-068 FR-070 FR-072 NFR-004 NFR-008 | TBL-001~TBL-006
-- data-ark §6.1·§6.3·§7 | ARCH-014
-- 적용: 운영자가 Supabase CLI로 적용 (이번 실행은 파일 작성만 — data-ark §7, C-008).
-- 접근 통제(봉인 제7계명): 5테이블 RLS 사용 + 정책 없음 = anon·authenticated 전면 거부. service role(Worker 전용)만 접근.
-- 함수는 SECURITY DEFINER가 아니다 — 호출자(service role) 권한으로 실행된다 (data-ark §6.3).

-- TBL-001 profiles — FR-012, FR-070
create table if not exists public.profiles (
  id          uuid        not null primary key,
  nickname    text        not null
                          check (nickname = btrim(nickname) and char_length(btrim(nickname)) between 2 and 12),
  token_hash  text        not null check (char_length(token_hash) = 64),
  rating      integer     not null default 1000 check (rating >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists idx_profiles_nickname   on public.profiles (lower(nickname));
create unique index if not exists idx_profiles_token_hash on public.profiles (token_hash);
create index        if not exists idx_profiles_rating     on public.profiles (rating desc, created_at asc);

-- TBL-002 matches — FR-068 (무효 경기는 행 없음)
create table if not exists public.matches (
  id            uuid        not null primary key,
  mode          text        not null check (mode in ('random','invite','bot')),
  bot_level     text                 check (bot_level is null or bot_level in ('easy','normal','hard')),
  winner_slot   smallint    not null check (winner_slot in (1,2)),
  end_reason    text        not null check (end_reason in ('topout','disconnect')),
  rounds_played smallint    not null check (rounds_played between 1 and 3),
  duration_ms   integer     not null check (duration_ms >= 0),
  verse_ref     text        not null check (char_length(btrim(verse_ref)) > 0),
  created_at    timestamptz not null default now(),
  check ((mode = 'bot') = (bot_level is not null))
);
create index if not exists idx_matches_created_at on public.matches (created_at desc);

-- TBL-003 match_players — FR-066, FR-068, FR-070
create table if not exists public.match_players (
  match_id      uuid     not null references public.matches (id) on delete cascade,
  slot          smallint not null check (slot in (1,2)),
  guest_id      uuid              references public.profiles (id),
  is_bot        boolean  not null default false,
  hero_id       text     not null check (hero_id in ('david','solomon','peter','paul')),
  rounds_won    smallint not null default 0 check (rounds_won between 0 and 2),
  rating_before integer,
  rating_after  integer,
  max_combo     integer  not null default 0 check (max_combo >= 0),
  lines_cleared integer  not null default 0 check (lines_cleared >= 0),
  attack_sent   integer  not null default 0 check (attack_sent >= 0),
  tetris_count  integer  not null default 0 check (tetris_count >= 0),
  pieces_placed integer  not null default 0 check (pieces_placed >= 0),
  quiz_correct  integer  not null default 0 check (quiz_correct >= 0),
  quiz_answered integer  not null default 0 check (quiz_answered >= 0),
  primary key (match_id, slot),
  check (is_bot = (guest_id is null)),
  check ((rating_before is null) = (rating_after is null)),
  check (quiz_correct <= quiz_answered)
);
create index if not exists idx_match_players_guest_id on public.match_players (guest_id, match_id);

-- TBL-004 player_progress — FR-067
create table if not exists public.player_progress (
  guest_id                 uuid        not null primary key references public.profiles (id) on delete cascade,
  rounds_played            integer     not null default 0 check (rounds_played >= 0),
  consecutive_round_losses integer     not null default 0 check (consecutive_round_losses >= 0),
  last_max_combo           integer     check (last_max_combo is null or last_max_combo >= 0),
  last_attack_per_min      real        check (last_attack_per_min is null or last_attack_per_min >= 0),
  last_quiz_rate           real        check (last_quiz_rate is null or last_quiz_rate between 0 and 1),
  updated_at               timestamptz not null default now()
);

-- TBL-005 achievements — FR-065
create table if not exists public.achievements (
  guest_id       uuid        not null references public.profiles (id) on delete cascade,
  achievement_id text        not null check (achievement_id in ('goliath_hunter')),
  achieved_at    timestamptz not null default now(),
  primary key (guest_id, achievement_id)
);

-- TBL-006 leaderboard VIEW — FR-071 (security_invoker: 호출자 권한으로 profiles RLS를 그대로 따른다)
create or replace view public.leaderboard with (security_invoker = true) as
  select id as guest_id, nickname, rating,
         rank() over (order by rating desc) as rank
  from public.profiles;

-- 봉인 제7계명: RLS 사용, 정책 없음 → anon·authenticated 전면 거부 (service role은 RLS 우회)
alter table public.profiles        enable row level security;
alter table public.matches         enable row level security;
alter table public.match_players   enable row level security;
alter table public.player_progress enable row level security;
alter table public.achievements    enable row level security;

revoke all on public.profiles, public.matches, public.match_players, public.player_progress, public.achievements
  from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;

-- FR-012 게스트 생성 — 프로필(레이팅 1000) + 진행 기록을 한 트랜잭션에서. token_hash는 반환하지 않는다 (봉인 제1계명)
create or replace function public.create_guest(p_id uuid, p_nickname text, p_token_hash text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  insert into public.profiles (id, nickname, token_hash)
  values (p_id, p_nickname, p_token_hash)
  returning * into v_profile;

  insert into public.player_progress (guest_id) values (p_id);

  return jsonb_build_object(
    'id', v_profile.id,
    'nickname', v_profile.nickname,
    'rating', v_profile.rating,
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at
  );
end;
$$;

-- FR-068 경기 1건 원자 기록 — matches 1 + match_players 2 + profiles 레이팅 ≤2 + player_progress ≤2
--          + achievements ≤2 (data-ark §5)
-- payload: {match_id, mode, bot_level, winner_slot, end_reason, rounds_played, duration_ms, verse_ref,
--           players:[{slot, guest_id, is_bot, hero_id, rounds_won, rating_before, rating_after, max_combo,
--                     lines_cleared, attack_sent, tetris_count, pieces_placed, quiz_correct, quiz_answered}] (2개),
--           progress:[{guest_id, rounds_played, consecutive_round_losses, last_max_combo, last_attack_per_min,
--                      last_quiz_rate}],
--           achievements:[{guest_id, achievement_id}]}
-- 반환: {created_at, new_achievements:[{guest_id, achievement_id}]} — 이번에 처음 달성한 업적만
create or replace function public.record_match(payload jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_created_at timestamptz;
  v_new        jsonb := '[]'::jsonb;
  v_item       jsonb;
  v_inserted   text;
begin
  insert into public.matches (id, mode, bot_level, winner_slot, end_reason, rounds_played, duration_ms, verse_ref)
  values (
    (payload ->> 'match_id')::uuid,
    payload ->> 'mode',
    payload ->> 'bot_level',
    (payload ->> 'winner_slot')::smallint,
    payload ->> 'end_reason',
    (payload ->> 'rounds_played')::smallint,
    (payload ->> 'duration_ms')::integer,
    payload ->> 'verse_ref'
  )
  returning created_at into v_created_at;

  for v_item in select value from jsonb_array_elements(payload -> 'players') loop
    insert into public.match_players (
      match_id, slot, guest_id, is_bot, hero_id, rounds_won, rating_before, rating_after,
      max_combo, lines_cleared, attack_sent, tetris_count, pieces_placed, quiz_correct, quiz_answered)
    values (
      (payload ->> 'match_id')::uuid,
      (v_item ->> 'slot')::smallint,
      (v_item ->> 'guest_id')::uuid,
      (v_item ->> 'is_bot')::boolean,
      v_item ->> 'hero_id',
      (v_item ->> 'rounds_won')::smallint,
      (v_item ->> 'rating_before')::integer,
      (v_item ->> 'rating_after')::integer,
      (v_item ->> 'max_combo')::integer,
      (v_item ->> 'lines_cleared')::integer,
      (v_item ->> 'attack_sent')::integer,
      (v_item ->> 'tetris_count')::integer,
      (v_item ->> 'pieces_placed')::integer,
      (v_item ->> 'quiz_correct')::integer,
      (v_item ->> 'quiz_answered')::integer
    );
    -- FR-070 사람 대 사람일 때만 레이팅 갱신
    if (v_item ->> 'guest_id') is not null and (v_item ->> 'rating_after') is not null then
      update public.profiles
         set rating = (v_item ->> 'rating_after')::integer, updated_at = now()
       where id = (v_item ->> 'guest_id')::uuid;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(payload -> 'progress', '[]'::jsonb)) loop
    insert into public.player_progress (
      guest_id, rounds_played, consecutive_round_losses, last_max_combo, last_attack_per_min, last_quiz_rate,
      updated_at)
    values (
      (v_item ->> 'guest_id')::uuid,
      (v_item ->> 'rounds_played')::integer,
      (v_item ->> 'consecutive_round_losses')::integer,
      (v_item ->> 'last_max_combo')::integer,
      (v_item ->> 'last_attack_per_min')::real,
      (v_item ->> 'last_quiz_rate')::real,
      now()
    )
    on conflict (guest_id) do update set
      rounds_played = excluded.rounds_played,
      consecutive_round_losses = excluded.consecutive_round_losses,
      last_max_combo = excluded.last_max_combo,
      last_attack_per_min = excluded.last_attack_per_min,
      last_quiz_rate = excluded.last_quiz_rate,
      updated_at = excluded.updated_at;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(payload -> 'achievements', '[]'::jsonb)) loop
    v_inserted := null;
    insert into public.achievements (guest_id, achievement_id)
    values ((v_item ->> 'guest_id')::uuid, v_item ->> 'achievement_id')
    on conflict (guest_id, achievement_id) do nothing
    returning achievement_id into v_inserted;
    if v_inserted is not null then
      v_new := v_new || jsonb_build_array(
        jsonb_build_object('guest_id', v_item ->> 'guest_id', 'achievement_id', v_inserted));
    end if;
  end loop;

  return jsonb_build_object('created_at', v_created_at, 'new_achievements', v_new);
end;
$$;

-- 함수 실행 권한: service role만 (PUBLIC 기본 EXECUTE 회수 — 봉인 제7계명)
revoke all on function public.create_guest(uuid, text, text) from public, anon, authenticated;
revoke all on function public.record_match(jsonb) from public, anon, authenticated;
grant execute on function public.create_guest(uuid, text, text) to service_role;
grant execute on function public.record_match(jsonb) to service_role;
