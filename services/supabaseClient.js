import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { SUPA_URL, SUPA_ANON_KEY } from '../constants/supabase';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};
const SUPABASE_URL =  SUPA_URL;
const SUPABASE_ANON_KEY = SUPA_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Você pode preencher app.json > expo.extra com as chaves públicas do Supabase.
  console.warn('[Supabase] Variáveis EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ausentes. Configure em app.json > extra.');
}

export const supabase = createClient(SUPABASE_URL , SUPABASE_ANON_KEY , {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export function getRedirectTo() {
  // Redirecionamento para OAuth (Google)
  return makeRedirectUri({ scheme: Linking.createURL('/').split('://')[0] || 'casalcash' });
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) return data;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type === 'success' && res.url) {
    const parsed = Linking.parse(res.url);
    const code = parsed?.queryParams?.code || parsed?.queryParams?.['code'];
    if (code) {
      // Troca o código por sessão (PKCE)
      const { error: exchError } = await supabase.auth.exchangeCodeForSession({ code });
      if (exchError) throw exchError;
    }
  }
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Info útil para debug em tela
export function getSupabaseInfo() {
  return {
    url: SUPABASE_URL || '',
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    fromExtra: Boolean(extra.EXPO_PUBLIC_SUPABASE_URL),
  };
}
