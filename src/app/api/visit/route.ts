import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Ziyaret kaydı.
 *
 * IP yalnızca sunucuya ulaşan istekte görünür — tarayıcı kendi IP'sini
 * bilemez. Bu yüzden uygulama açılışta buraya küçük bir istek atıyor ve
 * satırı BURASI yazıyor.
 *
 * Kimlik doğrulaması: istemci kendi erişim jetonunu gönderiyor, biz de
 * Supabase'e o jetonla bağlanıyoruz. Böylece satırdaki `user_id` istemcinin
 * beyanı değil, veritabanının doğruladığı kimlik oluyor. Oturumsuz istekler
 * kaydedilmez; RLS de `auth.uid() = user_id` şartını ikinci katman olarak zorlar.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestsByVisitor = new Map<string, { count: number; resetAt: number }>();

/** Vercel istemci IP'sini bu başlıklarda taşır; ilki en güvenilir olan. */
function readIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim().slice(0, 64);
  return request.headers.get('x-real-ip')?.slice(0, 64) ?? null;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = requestsByVisitor.get(key);

  if (!current || current.resetAt <= now) {
    requestsByVisitor.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 200 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload-too-large' }, { status: 413 });
  }

  let path: string | null = null;
  let accessToken: string | null = null;

  try {
    const body = (await request.json()) as {
      path?: string;
      accessToken?: string;
    };
    path = typeof body.path === 'string' ? body.path.slice(0, 512) : null;
    accessToken =
      typeof body.accessToken === 'string' && body.accessToken.length <= 4096
        ? body.accessToken
        : null;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-request' }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, reason: 'authentication-required' }, { status: 401 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, reason: 'invalid-session' }, { status: 401 });
  }

  const ip = readIp(request);
  if (isRateLimited(`${authData.user.id}:${ip ?? 'unknown'}`)) {
    return NextResponse.json({ ok: false, reason: 'rate-limited' }, { status: 429 });
  }

  const { error } = await supabase.from('visits').insert({
    user_id: authData.user.id,
    ip,
    user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
    path,
    referer: request.headers.get('referer')?.slice(0, 2048) ?? null,
  });

  // Ziyaret kaydı asla kullanıcıyı etkilemesin: hata olsa da 200 dönüyoruz.
  return NextResponse.json({ ok: !error });
}
