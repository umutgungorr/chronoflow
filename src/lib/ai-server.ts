import { createClient } from '@supabase/supabase-js';

/**
 * Sunucu tarafı AI yardımcıları (yalnızca route handler'lardan çağrılır).
 *
 * - `authorize`: Supabase yapılandırılmışsa geçerli oturum şart; yerel modda
 *   (Supabase yok) herkese açıktır ama oran sınırı vardır. API anahtarı
 *   sunucuda kalır, istemciye asla gönderilmez.
 * - `callGemini`: JSON şemalı tek seferlik üretim.
 */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function limited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

export type AuthResult = { ok: true } | { ok: false; status: number; reason: string };

export async function authorize(request: Request): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let identity = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

  if (url && anonKey) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || token.length > 4096) {
      return { ok: false, status: 401, reason: 'authentication-required' };
    }
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { ok: false, status: 401, reason: 'invalid-session' };
    identity = data.user.id;
  }

  if (limited(identity)) return { ok: false, status: 429, reason: 'rate-limited' };
  return { ok: true };
}

type GeminiOptions = {
  system: string;
  prompt: string;
  /** Verilirse JSON modu + şema. */
  schema?: Record<string, unknown>;
};

/** Metni döndürür; hata/zaman aşımında null (çağıran yerel yönteme düşer). */
export async function callGemini({ system, prompt, schema }: GeminiOptions): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: schema
            ? { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 }
            : { temperature: 0.6 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) return null;

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}
