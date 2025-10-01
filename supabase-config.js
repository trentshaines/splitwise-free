// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_URL = 'https://hwhfrxormdanbxitoofu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3aGZyeG9ybWRhbmJ4aXRvb2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI3NjgsImV4cCI6MjA3NDczODc2OH0.SO6tDRKQqKcsoXzInsVvjG5T206_VBXbj1YedcMeCRs';

// Initialize Supabase client with better timeout settings
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    global: {
        headers: {
            'x-client-info': 'supabase-js-web'
        }
    },
    db: {
        schema: 'public'
    },
    realtime: {
        timeout: 30000
    }
});

// Handle iOS app resume - refresh auth session
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            // App became visible again - refresh session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.auth.setSession(session);
            }
        }
    });
}
