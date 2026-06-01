import { supabase } from './supabase'

// Tüm bildirim INSERT'leri için ortak yol.
// write_notification SECURITY DEFINER RPC üzerinden geçer — server-side
// trigger anon direkt INSERT'i bloklar. RPC yoksa (deploy edilmeden önce)
// legacy direkt INSERT'e fallback'ler. Trigger uygulandıktan sonra fallback
// 42501 alır ve null döner; caller bunu sessizce ele almalı.
export async function writeNotification({ title, message, type = 'SYSTEM' }) {
  const safeTitle = (title ?? '').toString()
  const safeMessage = (message ?? '').toString()
  const safeType = (type ?? '').toString() || 'SYSTEM'

  const { data, error } = await supabase.rpc('write_notification', {
    p_title: safeTitle, p_message: safeMessage, p_type: safeType,
  })

  if (error && (error.code === '42883' || error.code === 'PGRST202')) {
    const { data: legacy, error: legacyErr } = await supabase
      .from('notifications')
      .insert([{ title: safeTitle, message: safeMessage, type: safeType, timestamp: Date.now(), is_read: false }])
      .select()
      .single()
    if (legacyErr) { console.error('[writeNotification fallback] failed:', legacyErr); return null }
    return legacy
  }
  if (error) {
    console.error('[writeNotification] failed:', error)
    return null
  }
  return data
}
