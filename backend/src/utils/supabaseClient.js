// src/utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// 初始化Supabase客户端
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

module.exports = supabase;