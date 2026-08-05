-- ============================================
-- WATCHTOGETHER — INITIAL SCHEMA + RLS
-- Run this in the Supabase SQL Editor
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  status      text default 'offline' check (status in ('online','idle','offline')),
  created_at  timestamptz not null default now()
);

-- 2. SERVERS (groups)
create table if not exists public.servers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  invite_code  text unique not null default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at   timestamptz not null default now()
);

-- 3. SERVER_MEMBERS (junction with roles)
create table if not exists public.server_members (
  server_id   uuid not null references public.servers(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  joined_at   timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- 4. CHANNELS
create table if not exists public.channels (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references public.servers(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('text','voice','watch')),
  position    int not null default 0
);

-- 5. MESSAGES
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);

-- 6. VOICE_PARTICIPANTS
create table if not exists public.voice_participants (
  channel_id         uuid not null references public.channels(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  joined_at          timestamptz not null default now(),
  is_screen_sharing  boolean not null default false,
  primary key (channel_id, user_id)
);

-- 7. WATCH_SESSIONS
create table if not exists public.watch_sessions (
  id                     uuid primary key default gen_random_uuid(),
  channel_id             uuid not null references public.channels(id) on delete cascade,
  video_source           text,
  video_url              text,
  is_playing             boolean not null default false,
  current_time_seconds   numeric not null default 0,
  updated_by             uuid references public.profiles(id) on delete set null,
  updated_at             timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_server_members_user on public.server_members(user_id);
create index if not exists idx_channels_server on public.channels(server_id);
create index if not exists idx_messages_channel on public.messages(channel_id);
create index if not exists idx_voice_participants_channel on public.voice_participants(channel_id);
create index if not exists idx_watch_sessions_channel on public.watch_sessions(channel_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_username);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-add owner to server_members + create default #general channel
create or replace function public.handle_new_server()
returns trigger as $$
begin
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  insert into public.channels (server_id, name, type, position)
  values (new.id, 'general', 'text', 0);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_server_created on public.servers;
create trigger on_server_created
  after insert on public.servers
  for each row execute function public.handle_new_server();

-- ============================================
-- HELPER FUNCTION
-- ============================================
create or replace function public.is_server_member(server_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.server_members
    where server_id = server_uuid and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================
-- RLS — PROFILES
-- ============================================
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================
-- RLS — SERVERS
-- ============================================
alter table public.servers enable row level security;

create policy "Members can view their servers"
  on public.servers for select using (public.is_server_member(id));

create policy "Authenticated users can create servers"
  on public.servers for insert with check (auth.uid() = owner_id);

create policy "Owners can update servers"
  on public.servers for update using (owner_id = auth.uid());

create policy "Owners can delete servers"
  on public.servers for delete using (owner_id = auth.uid());

-- ============================================
-- RLS — SERVER_MEMBERS
-- ============================================
alter table public.server_members enable row level security;

create policy "Members can view other members"
  on public.server_members for select using (public.is_server_member(server_id));

create policy "Users can join servers"
  on public.server_members for insert with check (auth.uid() = user_id);

create policy "Users can leave servers"
  on public.server_members for delete using (auth.uid() = user_id);

create policy "Admins can remove members"
  on public.server_members for delete using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = server_members.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

-- ============================================
-- RLS — CHANNELS
-- ============================================
alter table public.channels enable row level security;

create policy "Members can view channels"
  on public.channels for select using (public.is_server_member(server_id));

create policy "Admins can create channels"
  on public.channels for insert with check (
    public.is_server_member(server_id)
    and exists (
      select 1 from public.server_members sm
      where sm.server_id = channels.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

create policy "Admins can update channels"
  on public.channels for update using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = channels.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

create policy "Admins can delete channels"
  on public.channels for delete using (
    exists (
      select 1 from public.server_members sm
      where sm.server_id = channels.server_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner','admin')
    )
  );

-- ============================================
-- RLS — MESSAGES
-- ============================================
alter table public.messages enable row level security;

create policy "Members can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = messages.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.messages for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = messages.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Users can edit own messages"
  on public.messages for update using (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.messages for delete using (auth.uid() = user_id);

-- ============================================
-- RLS — VOICE_PARTICIPANTS
-- ============================================
alter table public.voice_participants enable row level security;

create policy "Members can view voice participants"
  on public.voice_participants for select using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = voice_participants.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can join voice"
  on public.voice_participants for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = voice_participants.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can update own voice state"
  on public.voice_participants for update using (auth.uid() = user_id);

create policy "Members can leave voice"
  on public.voice_participants for delete using (auth.uid() = user_id);

-- ============================================
-- RLS — WATCH_SESSIONS
-- ============================================
alter table public.watch_sessions enable row level security;

create policy "Members can view watch sessions"
  on public.watch_sessions for select using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = watch_sessions.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can create watch sessions"
  on public.watch_sessions for insert with check (
    auth.uid() = updated_by
    and exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = watch_sessions.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can update watch sessions"
  on public.watch_sessions for update using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = watch_sessions.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Members can delete watch sessions"
  on public.watch_sessions for delete using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = watch_sessions.channel_id and sm.user_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME (enable for relevant tables)
-- ============================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.voice_participants;
alter publication supabase_realtime add table public.watch_sessions;