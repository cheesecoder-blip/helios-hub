/* =========================================================
   HELIOS HUB V11 - SUPABASE CLIENT CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY = "your-actual-anon-key-here";

let supabaseClient = null;

if (typeof supabase !== "undefined" && SUPABASE_URL && !SUPABASE_URL.includes("your-project-id")) {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Supabase init exception:", e);
  }
}
