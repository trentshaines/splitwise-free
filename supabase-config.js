// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_URL = 'https://hwhfrxormdanbxitoofu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3aGZyeG9ybWRhbmJ4aXRvb2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjI3NjgsImV4cCI6MjA3NDczODc2OH0.SO6tDRKQqKcsoXzInsVvjG5T206_VBXbj1YedcMeCRs';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
