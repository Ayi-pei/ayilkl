import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase