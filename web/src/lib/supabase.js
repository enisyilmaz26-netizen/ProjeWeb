import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nspircxgtrhdcxtnvodz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_w6ogDn_vc2hgu1okx92j1w_yE0cctpZ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
