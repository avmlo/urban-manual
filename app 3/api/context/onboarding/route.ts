import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase-server';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';

// Lightweight intent parsing (no dependency on client helpers)
async function parseIntentSafe(query: string): Promise<any> {
  const lower = (query || '').toLowerCase();
  const cityMatch = lower.match(/in ([a-z\-\s]+)/i);
  const categoryMatch = lower.match(/(restaurant|hotel|cafe|bar|gallery|museum|park)/i);
  const modifiers: string[] = [];
  const MODS = ['romantic','michelin','fine-dining','vegetarian','vegan','cozy','modern','quiet','buzzy'];
  for (const m of MODS) if (lower.includes(m)) modifiers.push(m);
  return {
    city: cityMatch ? cityMatch[1].trim() : undefined,
    category: categoryMatch ? categoryMatch[1] : undefined,
    modifiers,
    keywords: []
  };
}

function getClientHints(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim();
  const language = (req.headers.get('accept-language') || '').split(',')[0].toLowerCase() || 'en';
  const timezone =
    req.headers.get('x-vercel-ip-timezone') ||
    req.headers.get('cf-timezone') ||
    req.headers.get('x-timezone') ||
    'UTC';
  return { ip, language, timezone };
}

async function generateGreeting(context: any): Promise<string> {
  try {
    const { generateJSON } = await import('@/lib/llm');
    const json = await generateJSON(
      URBAN_MANUAL_EDITOR_SYSTEM_PROMPT,
      `Create a 1-2 sentence warm greeting acknowledging the user's context.
Context: ${JSON.stringify(context)}
Constraints: concise, modern tone, end by inviting a follow-up.
Return only JSON: { "text": "..." }`
    );
    return json?.text || defaultGreeting(context);
  } catch {
    return defaultGreeting(context);
  }
}

function defaultGreeting(context: any): string {
  const city = context.city ? `${context.city[0].toUpperCase()}${context.city.slice(1)}` : null;
  if (city) return `Got it. Welcome — let’s tune this for ${city}. What’s the vibe — lunch or dinner?`;
  return `Noted. I’ll tailor picks to your taste. Where are you exploring today?`;
}

function buildMicroSurveyOptions() {
  return [
    { key: 'mood', options: ['cozy', 'modern', 'romantic', 'buzzy'] },
    { key: 'cuisine', options: ['japanese', 'french', 'italian', 'local'] },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { firstMessage } = await req.json();
    const hints = getClientHints(req);

    // Attempt auth context (optional)
    let userId: string | undefined;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {}

    const intent = firstMessage ? await parseIntentSafe(firstMessage) : { modifiers: [], keywords: [] };

    const archetypeSeed = {
      language: hints.language,
      timezone: hints.timezone,
      vibe_seed: ['cozy', 'modern', 'romantic', 'buzzy'][Math.floor(Math.random() * 4)],
    };

    const sessionContext = {
      city: intent.city,
      category: intent.category,
      meal: undefined,
      cuisine: undefined,
      mood: undefined,
      price_level: undefined,
      timezone: hints.timezone,
      language: hints.language,
      archetype_seed: archetypeSeed.vibe_seed,
      ip_hint: hints.ip || undefined,
    };

    // Best-effort store to Supabase conversation_sessions
    try {
      const admin = createServiceRoleClient();
      if (admin && userId) {
        await admin.from('conversation_sessions').upsert({
          user_id: userId,
          context: sessionContext,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    } catch (e) {
      // table may not exist yet; ignore
    }

    const greeting = await generateGreeting({ ...sessionContext, intent });
    const survey = buildMicroSurveyOptions();

    return NextResponse.json({
      context: sessionContext,
      intent,
      greeting,
      survey,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to initialise onboarding', details: e.message }, { status: 500 });
  }
}


