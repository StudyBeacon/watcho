# WatchTogether

A private, invite-based chat app where friends create groups ("servers"), chat and voice/video call inside channels, and watch movies together with synced playback and high-quality screen sharing.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Realtime)
- **Voice/Video**: LiveKit (SFU) — installed, integration in Phase 3
- **Design**: Apple-inspired UI (iOS/macOS system colors, frosted glass, SF Pro fonts)

## What's Built — All Phases

### Phase 1: Auth + Group/Channel CRUD
- ✅ Email/password authentication with auto-profile creation
- ✅ Create servers (groups) with auto-generated invite codes
- ✅ Join servers via invite code
- ✅ Create channels (text, voice, watch party types)
- ✅ Discord-style 3-column layout with Apple aesthetics
- ✅ Server sidebar (far-left icon rail)
- ✅ Channel sidebar (grouped by type, with user menu)
- ✅ Row Level Security on all tables
- ✅ Dark/light mode (follows system preference)

### Phase 2: Realtime Text Chat
- ✅ Realtime message delivery via Supabase Postgres Changes
- ✅ Typing indicators via Realtime Presence
- ✅ Message editing and deletion
- ✅ Message grouping (consecutive messages from same user)
- ✅ Auto-scroll with "jump to latest" button
- ✅ Message reactions (👍 ❤️ 😂 😮 😢 🎉)

### Phase 3: Voice/Video Calls (LiveKit)
- ✅ LiveKit token generation API route with server membership validation
- ✅ Join/leave voice channels with participant tracking
- ✅ Mute/deafen/camera controls
- ✅ Speaking indicators with green border highlight
- ✅ Participant grid with video/audio tiles
- ✅ Automatic cleanup on disconnect

### Phase 4: Screen Share Tuning
- ✅ 1080p at 30-60fps screen capture constraints
- ✅ VP9 > AV1 > H.264 codec preference detection
- ✅ Boosted bitrate (8 Mbps for 1080p screen share)
- ✅ Simulcast for adaptive quality on weak connections
- ✅ Screen share badge and dedicated presentation tile

### Phase 5: Watch Party
- ✅ **Option A**: Screen-share movie night (works via Phase 4)
- ✅ **Option B**: Synced playback engine via Realtime Broadcast
- ✅ YouTube IFrame API integration (play/pause/seek sync)
- ✅ Direct video file support (mp4, webm, etc.)
- ✅ Host model with play/pause/seek controls
- ✅ Drift correction every 10 seconds
- ✅ Watch session state persistence in database

### Phase 6: Roles, Moderation, Polish
- ✅ Server settings (rename, invite code copy, delete)
- ✅ Channel settings (rename, delete)
- ✅ Member list with role management (make admin/remove admin)
- ✅ Kick members (admin only)
- ✅ Message reactions with quick emoji picker
- ✅ Bans and mutes tables with RLS policies
- ✅ Message replies support (parent_id column)

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for it to provision

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
3. Paste and run it

This creates all tables, triggers, RLS policies, and enables Realtime.

### 3. Configure Environment Variables

1. In your Supabase dashboard, go to **Settings → API**
2. Copy your **Project URL** and **anon public key**
3. Update `.env.local` with these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Configure Auth (Optional)

By default, Supabase requires email confirmation. To disable it for development:
1. Go to **Authentication → Settings**
2. Turn off **"Confirm email"**

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
watchtogether/
├── app/
│   ├── (auth)/                    # Auth pages (login, signup)
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx             # Centered card layout
│   ├── (main)/                    # Authenticated app
│   │   ├── servers/
│   │   │   ├── page.tsx           # Welcome screen
│   │   │   └── [serverId]/
│   │   │       ├── layout.tsx     # Fetches server + channels
│   │   │       └── channels/
│   │   │           ├── page.tsx   # Redirects to first channel
│   │   │           └── [channelId]/
│   │   │               └── page.tsx  # Channel view
│   │   └── layout.tsx             # 3-column layout + server sidebar
│   ├── globals.css                # Apple design system
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Redirects based on auth
├── components/
│   ├── ui/                        # Button, Input, Avatar, Modal
│   ├── auth/                      # Auth form
│   ├── servers/                   # Server sidebar, modals
│   └── channels/                  # Channel sidebar, modal
├── lib/
│   ├── supabase/                  # Client, server, middleware
│   └── utils.ts                   # cn(), formatters
├── types/
│   └── database.ts                # Database types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Full schema + RLS
└── middleware.ts                  # Auth session refresh
```

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles (username, avatar, status) |
| `servers` | Groups with invite codes |
| `server_members` | Junction table with roles (owner/admin/member) |
| `channels` | Text, voice, and watch party channels |
| `messages` | Chat messages (Phase 2) |
| `voice_participants` | Voice call state (Phase 3) |
| `watch_sessions` | Synced playback state (Phase 5) |

## Build Phases

- ✅ **Phase 1** — Foundation: Auth + group/channel CRUD
- ✅ **Phase 2** — Realtime text chat
- ✅ **Phase 3** — Voice/video calls (LiveKit)
- ✅ **Phase 4** — Screen share tuning (1080p, VP9/AV1, simulcast)
- ✅ **Phase 5** — Watch party (screen-share movie night + synced YouTube)
- ✅ **Phase 6** — Roles, moderation, polish

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy