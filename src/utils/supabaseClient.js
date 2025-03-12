import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase