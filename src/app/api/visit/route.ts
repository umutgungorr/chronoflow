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
 * beyanı değil, veritabanının doğruladığı kimlik oluyor — RLS politikası
 * `auth.uid() = user_id` şartını zorluyor. Jeton yoksa satır anonim yazılır.
 */

export const runtime = 'edge';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Vercel istemci IP'sini bu başlıklarda taşır; ilki en güvenilir olan. */
function readIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip');
}

export async function POST(request: Request) {
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 200 });
  }

  let path: string | null = null;
  let accessToken: string | null = null;
  let userId: string | null = null;

  try {
    const body = (await request.json()) as {
      path?: string;
      accessToken?: string;
      userId?: string;
    };
    path = body.path ?? null;
    accessToken = body.accessToken ?? null;
    userId = body.userId ?? null;
  } catch {
    // Gövde okunamadıysa yine de anonim bir satır yazmayı deneriz.
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });

  const { error } = await supabase.from('visits').insert({
    // Jeton yoksa kimlik iddiasını yok sayıyoruz: doğrulanamayan bir
    // kimliği kaydetmek, kaydetmemekten daha kötü.
    user_id: accessToken ? userId : null,
    ip: readIp(request),
    user_agent: request.headers.get('user-agent'),
    path,
    referer: request.headers.get('referer'),
  });

  // Ziyaret kaydı asla kullanıcıyı etkilemesin: hata olsa da 200 dönüyoruz.
  return NextResponse.json({ ok: !error });
}
