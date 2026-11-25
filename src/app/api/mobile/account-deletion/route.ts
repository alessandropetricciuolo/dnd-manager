import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/utils/supabase/admin';
import { handleAccountDeletionRequest } from '@/lib/mobile/account-deletion-request';

export const runtime = 'nodejs';

function extractBearer(request: Request): string | null {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Servizio temporaneamente non disponibile.' }, { status: 503 });
  }

  const token = extractBearer(request);
  if (!token) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: openRequest, error } = await (admin.from('account_deletion_requests' as never) as any)
    .select('status, created_at')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Servizio temporaneamente non disponibile.' }, { status: 503 });
  }

  return NextResponse.json({ request: openRequest ?? null });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Servizio temporaneamente non disponibile.' }, { status: 503 });
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const result = await handleAccountDeletionRequest(request, {
    authenticate: async (accessToken) => {
      const { data: { user }, error } = await authClient.auth.getUser(accessToken);
      if (error || !user) return { userId: null };
      return { userId: user.id };
    },
    createRequest: async (userId) => {
      const admin = createSupabaseAdminClient();
      const { error } = await (admin.from('account_deletion_requests' as never) as any)
        .insert({ user_id: userId });
      if (error && error.code !== '23505') {
        console.error('[mobile account deletion] request insert failed', error.message);
      }
      return { error };
    },
  });
  return NextResponse.json(result.body, { status: result.status });
}
