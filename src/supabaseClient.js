import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aahazlulwpcorwpvqdab.supabase.co'
const supabaseAnonKey = 'sb_publishable_FH8OyPqmcNddSZ5RiM-9Yw_piCqaZHq'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
