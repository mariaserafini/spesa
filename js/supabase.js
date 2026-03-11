// ============================================================
// SUPABASE.JS — configurazione client
// Sostituisci con i tuoi valori:
// Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL = 'https://pbvjzvocwmfpdugktcro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Lq_PBVH3eyzQh7NZdmR39g_sZexqaT7';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
