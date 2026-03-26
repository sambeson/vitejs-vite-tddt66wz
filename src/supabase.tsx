import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function backupToSupabase(userId: string, mentaculousData?: any, orderData?: string[]) {
  // Use provided data if available, otherwise fall back to user-specific localStorage
  const mentaculous = mentaculousData ? JSON.stringify(mentaculousData) : localStorage.getItem(`mentaculous_${userId}`);
  const mentorder = orderData ? JSON.stringify(orderData) : localStorage.getItem(`mentaculousOrder_${userId}`);
  
  console.log(`🔄 Backing up data for user "${userId}":`, { mentaculous: !!mentaculous, mentorder: !!mentorder });
  
  const { error } = await supabase
    .from('mentaculous_backups')
    .upsert(
      [
        {
          user_id: userId,
          mentaculous: mentaculous || '',
          mentorder: mentorder || '',
        }
      ],
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('Backup failed:', error);
    return false;
  } else {
    console.log(`✅ Backup successful for user "${userId}"`);
    return true;
  }
}