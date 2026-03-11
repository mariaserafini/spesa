// ============================================================
// CONFIGURAZIONE SUPABASE
// Sostituisci i valori con quelli del tuo progetto Supabase:
// Supabase Dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL = 'https://pbvjzvocwmfpdugktcro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Lq_PBVH3eyzQh7NZdmR39g_sZexqaT7';

// Configurazione Supabase
const { createClient } = supabase;
const _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = document.getElementById('app');
//export const GOOGLE_API_KEY = 'AIzaSyAhGtvCErZcWLnCg1GLXPXJkbjWBaEk7pE';
const _p1 = "AIzaSyDLwfdxJ";
const _p2 = "ohBvXy";
const _p3 = "SSl2890yIAN0VWdD7o";
//export const GEMINI_API_KEY = _p1 + "-" + _p2 + "-" + _p3;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
