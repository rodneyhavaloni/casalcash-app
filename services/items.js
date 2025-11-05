import { supabase } from './supabaseClient';

export async function addItem({ name, value, date, category, location, userId }) {
  const payload = {
    name,
    value,
    date, // string 'YYYY-MM-DD'
    category,
    location,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('itens').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}
