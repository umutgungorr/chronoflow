<div align="center">

# ⏱️ ChronoFlow

**Local-First Daily Time-Blocking, Cognitive Focus & Goal Scheduler**

[![CI](https://github.com/umutgungorr/chronoflow/actions/workflows/ci.yml/badge.svg)](https://github.com/umutgungorr/chronoflow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ea44f.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Case Study](https://img.shields.io/badge/Case%20Study-umutgungorr.com-58a6ff)](https://umutgungorr.com/projects/chronoflow)

</div>

---

## Overview

**ChronoFlow** is a local-first, offline-capable daily time-blocking and focus planner built with **Next.js 16**, **React 19**, **TypeScript**, **Zustand**, and **Supabase**.

It is designed around a strict **zero-lock-in architecture**: the application boots and operates 100% locally via `localStorage` with deterministic conflict resolution, and seamlessly upgrades to multi-device cloud synchronization when Supabase credentials are provided.

---

## Key Capabilities

- **15-Minute Tactile Time Grid:** Drag-and-drop block scheduling (`@dnd-kit`) with collision detection and automatic smart buffer insertion between deep-work sessions.
- **Deterministic Natural-Language Parser ("Magic Schedule"):** Rule-based schedule parser that converts free-form text into structured daily time blocks with zero external LLM latency or API cost.
- **Local-First Tombstone Sync Engine:** Offline-first state machine (`Zustand`) that reconciles local edits with Supabase using server-stamped `updated_at` LWW (Last-Write-Wins) and soft-delete tombstones (`deleted_at`) so deleted blocks never resurrect across devices.
- **Horizon Goal Tracking:** Milestone and target-date tracker integrated directly alongside the daily execution grid.
- **Defense-in-Depth Supabase RLS:** Strict Row-Level Security (`auth.uid() = user_id`), explicit `REVOKE ALL FROM anon`, and rate-limited server-side telemetry (`/api/visit`).

---

## System Architecture & Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19 | Server/Client hybrid rendering & PWA manifest |
| **Language** | TypeScript 5 (Strict Mode) | End-to-end type safety across UI, store, and Supabase schema |
| **State & Sync** | Zustand + Custom Sync Engine | Optimistic local mutations, undo stack, and bi-directional cloud sync |
| **UI & Interaction** | Tailwind CSS 4, Base UI, `@dnd-kit`, Lucide | Accessible, keyboard-friendly 15-minute slot manipulation |
| **Database & Auth** | Supabase (PostgreSQL + RLS) | Optional cloud persistence & multi-device synchronization |
| **Quality Gate** | Vitest, Testing Library, ESLint 9 | Unit tests for scheduler math, collision layout, parser, and state stores |

---

## Quickstart (Local-First Mode)

Requires **Node.js 20+** and `npm`.

```bash
git clone https://github.com/umutgungorr/chronoflow.git
cd chronoflow
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. If `.env.local` is left empty, ChronoFlow runs entirely in **local-first browser storage mode** with zero external dependencies.

### Optional Cloud Sync (Supabase)

To enable cross-device sync, provide your Supabase project URL and publishable anon key in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then apply the SQL migrations in `supabase/` (`schema.sql`, `goals.sql`, `day-titles.sql`, `admin.sql`) via the Supabase SQL Editor.

---

## Development & Verification Commands

```bash
npm run dev          # Start local development server
npm run lint         # Run ESLint static checks
npm test             # Run Vitest unit test suite (scheduler, layout, parser, store)
npm run build        # Build production Next.js bundle
```

---

## Repository Structure

```text
src/
├── app/             # Next.js App Router pages, PWA manifest & rate-limited /api/visit route
├── components/      # Timeline grid, drag-and-drop task blocks, goal modals & layout primitives
├── hooks/           # Day rollover, hydration guards, keyboard undo shortcuts & admin checks
├── lib/             # Pure scheduling math, collision layout, natural-language parser & Supabase sync
├── store/           # Zustand state stores (tasks, auth, admin) with unit tests
└── types/           # Shared domain types
supabase/            # Idempotent PostgreSQL schema, triggers & RLS policies
```

---

## Case Study & Architecture Deep Dive

Read the full engineering case study, architectural trade-offs, and design decisions on **[umutgungorr.com/projects/chronoflow](https://umutgungorr.com/projects/chronoflow)**.

---

## License

Licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 **Umut Güngör**.
