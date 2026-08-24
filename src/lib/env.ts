/**
 * Whether the Supabase backend is wired up. Kept in its own module so both the
 * data layer and the auth layer can ask without importing each other.
 *
 * Phase 1 can be deployed before the database exists, and an unconfigured
 * instance should explain itself rather than return a 500.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
