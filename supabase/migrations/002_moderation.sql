-- ============================================
-- WATCHTOGETHER — PHASE 6 MODERATION
-- ============================================

-- ============================================
-- BANS
-- ============================================
create table if not exists public.bans (
  server_id   uuid not null references public.servers(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  banned_by   uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- ============================================
-- MUTES
-- ============================================
create table if not exists public.mutes (
  server_id   uuid not null references public.servers(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  muted_by    uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- ============================================
-- MESSAGE REACTIONS
-- ============================================
create table if not exists public.message_reactions (
  message_id  uuid not null references public.messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- ============================================
-- ADD parent_id TO MESSAGES (for replies)
-- ============================================
alter table public.messages
  add column if not exists parent_id uuid references public.messages(id) on delete set null;

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_bans_server on public.bans(server_id);
create index if not exists idx_mutes_server on public.mutes(server_id);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);

-- ============================================
-- WATCH_SESSIONS: add video_title column
-- ============================================
alter table public.watch_sessions
  add column if not exists video_title text;

-- ============================================
-- RLS — BANS
-- ============================================
alter table public.bans enable row level security;

create policy "Members can view bans"
  on public.bans for select using (public.is_server_member(server_id));

create policy "Admins can ban users"
  on public.bans for insert with check (
    public.is_server_member(server_id)
    and exists (
      select 1 from public.server_members sm
      where sm.server_id = bans.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

create policy "Admins can unban users"
  on public.bans for delete using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = bans.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

-- ============================================
-- RLS — MUTES
-- ============================================
alter table public.mutes enable row level security;

create policy "Members can view mutes"
  on public.mutes for select using (public.is_server_member(server_id));

create policy "Admins can mute users"
  on public.mutes for insert with check (
    public.is_server_member(server_id)
    and exists (
      select 1 from public.server_members sm
      where sm.server_id = mutes.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

create policy "Admins can unmute users"
  on public.mutes for delete using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = mutes.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

-- ============================================
-- RLS — MESSAGE_REACTIONS
-- ============================================
alter table public.message_reactions enable row level security;

create policy "Members can view reactions"
  on public.message_reactions for select using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      join public.server_members sm on sm.server_id = c.server_id
      where m.id = message_reactions.message_id and sm.user_id = auth.uid()
    )
  );

create policy "Users can add reactions"
  on public.message_reactions for insert with check (auth.uid() = user_id);

create policy "Users can remove own reactions"
  on public.message_reactions for delete using (auth.uid() = user_id);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.message_reactions;