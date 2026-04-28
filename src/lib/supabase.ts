import { createClient } from '@supabase/supabase-js';

// TODO: replace these with values from your Supabase dashboard
// (Settings -> API -> Project URL and anon public key), and
// ideally load them from a .env file or secure config.
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

