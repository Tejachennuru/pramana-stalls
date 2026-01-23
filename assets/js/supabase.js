
// Initialize Supabase Client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = 'https://drrbqkymsvtbxrqcrpaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRycmJxa3ltc3Z0YnhycWNycGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjg4ODIsImV4cCI6MjA4NDcwNDg4Mn0.nHS5RLiNFcGBjKY25PBwfAmraYsPK4NFsB6SnJS53Lg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth Helper
export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) console.error('Error logging in:', error);
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
    else window.location.reload();
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
