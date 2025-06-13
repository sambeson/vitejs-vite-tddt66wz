import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function backupToSupabase(userId: string) {
  const mentaculous = localStorage.getItem('mentaculous');
  const order = localStorage.getItem('mentaculousOrder');
  const { data, error } = await supabase
    .from('mentaculous_backups')
    .insert([
      {
        user_id: userId,
        mentaculous: mentaculous || '',
        order: order || '',
      }
    ]);
  if (error) {
    console.error('Backup failed:', error);
    return false;
  } else {
    console.log('Backup successful:', data);
    return true;
  }
}