-- TASK-030-2 · FR-072 · NFR-004 · D-05 · D-20 · TBL-001~004 · TBL-006 · data-ark §7.2·§7.3 — Supabase Postgres 스키마·원자적 경기 기록 함수·RLS
-- 이번 실행에서는 실제 프로젝트에 적용하지 않는다 (C-008). 키가 생기면 `supabase db push`로 적용한다.
-- TBL-005(invite_codes)·TBL-007(schema_migrations)은 저장 모드와 무관하게 Matchmaker DO SQLite에만 둔다 (architecture §4.2).

CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY,
  nickname      text NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 2 AND 12
                                     AND nickname = trim(nickname)
                                     AND nickname ~ '^[가-힣A-Za-z0-9_]{2,12}$'),
  nickname_key  text NOT NULL UNIQUE CHECK (char_length(trim(nickname_key)) > 0 AND nickname_key = lower(nickname)),
  token_hash    text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  rating        integer NOT NULL DEFAULT 1000 CHECK (rating BETWEEN 0 AND 5000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_rating ON public.profiles (rating DESC, created_at ASC);

CREATE TABLE public.matches (
  id             uuid PRIMARY KEY,
  room_id        uuid NOT NULL UNIQUE,
  mode           text NOT NULL CHECK (mode IN ('random','invite','bot')),
  player1_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  player2_id     uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bot_level      text CHECK (bot_level IN ('easy','normal','hard')),
  hero1          text NOT NULL CHECK (hero1 IN ('david','solomon','peter','paul')),
  hero2          text NOT NULL CHECK (hero2 IN ('david','solomon','peter','paul')),
  winner_slot    smallint NOT NULL CHECK (winner_slot IN (1,2)),
  rounds1        smallint NOT NULL DEFAULT 0 CHECK (rounds1 BETWEEN 0 AND 2),
  rounds2        smallint NOT NULL DEFAULT 0 CHECK (rounds2 BETWEEN 0 AND 2),
  end_reason     text NOT NULL CHECK (end_reason IN ('topout','disconnect')),
  duration_ms    integer NOT NULL CHECK (duration_ms BETWEEN 0 AND 86400000),
  stats          jsonb NOT NULL,
  rating_delta1  integer,
  rating_delta2  integer,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((mode = 'bot' AND player2_id IS NULL AND bot_level IS NOT NULL
          AND rating_delta1 IS NULL AND rating_delta2 IS NULL)
      OR (mode <> 'bot' AND player2_id IS NOT NULL AND bot_level IS NULL AND player2_id <> player1_id)),
  CHECK (end_reason = 'disconnect' OR (winner_slot = 1 AND rounds1 = 2) OR (winner_slot = 2 AND rounds2 = 2))
);
CREATE INDEX idx_matches_player1_id_created_at ON public.matches (player1_id, created_at DESC);
CREATE INDEX idx_matches_player2_id_created_at ON public.matches (player2_id, created_at DESC);

CREATE TABLE public.player_progress (
  guest_id       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rounds_played  integer NOT NULL DEFAULT 0 CHECK (rounds_played >= 0),
  loss_streak    integer NOT NULL DEFAULT 0 CHECK (loss_streak >= 0),
  last_record    jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (loss_streak <= rounds_played)
);

CREATE TABLE public.player_achievements (
  guest_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id  text NOT NULL CHECK (achievement_id IN ('goliath_hunter')),
  match_id        uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  achieved_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, achievement_id)
);

CREATE VIEW public.leaderboard AS
  SELECT ROW_NUMBER() OVER (ORDER BY rating DESC, created_at ASC) AS rank,
         id AS guest_id, nickname, rating
    FROM public.profiles
   ORDER BY rating DESC, created_at ASC
   LIMIT 100;

-- RLS: Supabase Auth 미사용(K5) → anon/authenticated 정책 0개 = 전면 거부. service role(Worker)만 접근.
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.leaderboard FROM anon, authenticated;

-- data-ark §7.3 원자적 경기 기록 (함수 1회 호출 = 1트랜잭션). 입력 p = worker/src/store/store.ts RecordMatchInput (camelCase JSON).
-- 반환 = RecordMatchResult { ratingDelta1, ratingDelta2, newAchievements: [{guestId, achievementId}], previousRecords: {guestId: record|null} }
CREATE OR REPLACE FUNCTION public.record_match(p jsonb) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing   record;
  r1         integer;
  r2         integer;
  d1         integer := NULL;
  d2         integer := NULL;
  prog       jsonb;
  ach        jsonb;
  last_rec   jsonb;
  inserted   uuid;
  prev       jsonb := '{}'::jsonb;
  new_ach    jsonb := '[]'::jsonb;
  has_rating boolean := jsonb_typeof(p->'rating') = 'object';
BEGIN
  -- 같은 방 재시도는 기존 행 반환으로 멱등 (room_id UNIQUE)
  SELECT rating_delta1, rating_delta2 INTO existing FROM public.matches WHERE room_id = (p->>'roomId')::uuid;
  IF FOUND THEN
    RETURN jsonb_build_object('ratingDelta1', existing.rating_delta1, 'ratingDelta2', existing.rating_delta2,
                              'newAchievements', '[]'::jsonb, 'previousRecords', '{}'::jsonb);
  END IF;

  -- 1단계: 사람 대 사람이면 두 프로필 잠금 + 기대 레이팅 비교
  IF has_rating THEN
    SELECT rating INTO r1 FROM public.profiles WHERE id = (p->>'player1Id')::uuid FOR UPDATE;
    SELECT rating INTO r2 FROM public.profiles WHERE id = (p->>'player2Id')::uuid FOR UPDATE;
    IF r1 IS DISTINCT FROM (p->'rating'->>'expectedRating1')::integer
       OR r2 IS DISTINCT FROM (p->'rating'->>'expectedRating2')::integer THEN
      RAISE EXCEPTION 'RATING_CHANGED';
    END IF;
    d1 := (p->'rating'->>'newRating1')::integer - r1;
    d2 := (p->'rating'->>'newRating2')::integer - r2;
  END IF;

  -- 2단계: 경기 삽입
  INSERT INTO public.matches (id, room_id, mode, player1_id, player2_id, bot_level, hero1, hero2, winner_slot,
                              rounds1, rounds2, end_reason, duration_ms, stats, rating_delta1, rating_delta2)
  VALUES ((p->>'matchId')::uuid, (p->>'roomId')::uuid, p->>'mode', (p->>'player1Id')::uuid, (p->>'player2Id')::uuid,
          p->>'botLevel', p->>'hero1', p->>'hero2', (p->>'winnerSlot')::smallint, (p->>'rounds1')::smallint,
          (p->>'rounds2')::smallint, p->>'endReason', (p->>'durationMs')::integer, p->'stats', d1, d2);

  -- 3단계: 레이팅 갱신 (사람 대 사람만)
  IF has_rating THEN
    UPDATE public.profiles SET rating = (p->'rating'->>'newRating1')::integer WHERE id = (p->>'player1Id')::uuid;
    UPDATE public.profiles SET rating = (p->'rating'->>'newRating2')::integer WHERE id = (p->>'player2Id')::uuid;
  END IF;

  -- 4단계: 진행 기록 (갱신 전 last_record 반환 — 성장 수치용)
  FOR prog IN SELECT value FROM jsonb_array_elements(COALESCE(p->'progress', '[]'::jsonb)) LOOP
    SELECT last_record INTO last_rec FROM public.player_progress WHERE guest_id = (prog->>'guestId')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'STORE_UNAVAILABLE';
    END IF;
    prev := prev || jsonb_build_object(prog->>'guestId', last_rec);
    UPDATE public.player_progress
       SET rounds_played = rounds_played + (prog->>'roundsDelta')::integer,
           loss_streak   = (prog->>'lossStreak')::integer,
           last_record   = prog->'record',
           updated_at    = now()
     WHERE guest_id = (prog->>'guestId')::uuid;
  END LOOP;

  -- 5단계: 업적 (이미 달성한 업적은 무시, 실제 삽입분만 반환)
  FOR ach IN SELECT value FROM jsonb_array_elements(COALESCE(p->'achievements', '[]'::jsonb)) LOOP
    inserted := NULL;
    INSERT INTO public.player_achievements (guest_id, achievement_id, match_id)
    VALUES ((ach->>'guestId')::uuid, ach->>'achievementId', (p->>'matchId')::uuid)
    ON CONFLICT DO NOTHING
    RETURNING guest_id INTO inserted;
    IF inserted IS NOT NULL THEN
      new_ach := new_ach || jsonb_build_array(jsonb_build_object('guestId', ach->>'guestId', 'achievementId', ach->>'achievementId'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ratingDelta1', d1, 'ratingDelta2', d2, 'newAchievements', new_ach, 'previousRecords', prev);
END;
$$;

-- 함수 실행도 service role(Worker)만 — 클라이언트 쓰기 경로 0개 (api-gate R-12, 봉인 제7계명)
REVOKE ALL ON FUNCTION public.record_match(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_match(jsonb) TO service_role;
