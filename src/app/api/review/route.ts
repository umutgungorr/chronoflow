import { NextResponse } from 'next/server';

import { authorize, callGemini, isAiConfigured } from '@/lib/ai-server';
import type { DaySummary } from '@/lib/day-review';

const SYSTEM = `Sen sıcak ama dürüst bir Türkçe verimlilik koçusun. Kullanıcının günlük
özetini (sayılar) 3-4 kısa cümleyle yorumla: neyi iyi yaptı, neyi yarına taşımalı,
yarın için tek somut öneri. Madde işareti, başlık ya da emoji kullanma.`;

function toSummary(raw: unknown): DaySummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const plannedMinutes = num(s.plannedMinutes);
  const completedMinutes = num(s.completedMinutes);
  const taskCount = num(s.taskCount);
  const completedCount = num(s.completedCount);
  const completionRate = num(s.completionRate);
  if (
    plannedMinutes === null ||
    completedMinutes === null ||
    taskCount === null ||
    completedCount === null ||
    completionRate === null
  ) {
    return null;
  }

  return {
    plannedMinutes,
    completedMinutes,
    taskCount,
    completedCount,
    completionRate,
    byCategory: typeof s.byCategory === 'object' && s.byCategory ? (s.byCategory as DaySummary['byCategory']) : {},
    openTitles: Array.isArray(s.openTitles)
      ? s.openTitles.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 80)).slice(0, 5)
      : [],
  };
}

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, reason: 'not-configured' });
  }

  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  let summary: DaySummary | null = null;
  try {
    const body = (await request.json()) as { summary?: unknown };
    summary = toSummary(body.summary);
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-request' }, { status: 400 });
  }
  if (!summary) return NextResponse.json({ ok: false, reason: 'invalid-request' }, { status: 400 });

  const review = await callGemini({
    system: SYSTEM,
    prompt: `Günün özeti (JSON): ${JSON.stringify(summary)}`,
  });
  if (!review) return NextResponse.json({ ok: false, reason: 'upstream-failed' });

  return NextResponse.json({ ok: true, review: review.trim().slice(0, 1200) });
}
