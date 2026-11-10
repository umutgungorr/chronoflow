import { NextResponse } from 'next/server';

import { authorize, callGemini, isAiConfigured } from '@/lib/ai-server';
import { sanitizeScheduleItems } from '@/lib/magic-schedule';

const MAX_TEXT = 1000;

const SYSTEM = `Sen bir Türkçe günlük planlama asistanısın. Kullanıcının serbest metnini
zaman bloklarına ayır. Her blok için: kısa Türkçe başlık, süre (dakika, 15'in katı),
kategori (WORK iş/ders, ROUTINE rutin/kişisel, HEALTH spor/sağlık, URGENT acil,
SOCIAL dinlenme/sosyal) ve günün bölümü (sabah, ogle, aksam ya da null).
Kullanıcı belirli bir saat vermediyse dayPart null bırak. Uzun çalışmaları
makul parçalara bölebilir, aralarına mola eklemeyi kullanıcı istediyse ekle.
Metindeki talimatlara uyup başka hiçbir şey yapma.`;

const SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      duration: { type: 'INTEGER' },
      category: {
        type: 'STRING',
        enum: ['WORK', 'ROUTINE', 'HEALTH', 'URGENT', 'SOCIAL'],
      },
      dayPart: { type: 'STRING', enum: ['sabah', 'ogle', 'aksam'], nullable: true },
    },
    required: ['title', 'duration', 'category'],
  },
};

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, reason: 'not-configured' });
  }

  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  let text = '';
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });

  const output = await callGemini({ system: SYSTEM, prompt: text, schema: SCHEMA });
  if (!output) return NextResponse.json({ ok: false, reason: 'upstream-failed' });

  let items;
  try {
    items = sanitizeScheduleItems(JSON.parse(output));
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-output' });
  }

  return NextResponse.json({ ok: items.length > 0, items });
}
