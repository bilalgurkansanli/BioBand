import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set — ' +
      'see .env.example. Sign-in and cloud sync are disabled until configured.',
  );
}

// A harmless placeholder so `createClient` never throws when unconfigured —
// every call site checks `isSupabaseConfigured` before actually using this.
const clientUrl = supabaseUrl || 'https://placeholder.supabase.co';

/**
 * The AsyncStorage key supabase-js keeps the session under.
 *
 * Named here, rather than left implicit, because launch has to look at it
 * directly: `getSession()` answers "no session" both when there is none and
 * when a stored one could not be refreshed offline, and only the second must
 * keep the user's data. The value is supabase-js's own default for this URL,
 * so sessions saved before it was spelled out are still found.
 */
export const AUTH_STORAGE_KEY = `sb-${new URL(clientUrl).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(clientUrl, supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's token auto-refresh timer needs an explicit nudge to pause/resume
// with the app's foreground state on native platforms (see Supabase RN docs).
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) {
    return;
  }
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
