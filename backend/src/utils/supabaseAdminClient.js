const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

const supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceKey,
    {
        auth: config.supabase.options,
        ssl: config.server.ssl
    }
);

// 验证连接
supabaseAdmin.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log('Supabase Admin Client: 连接成功');
    } else if (event === 'SIGNED_OUT') {
        console.error('Supabase Admin Client: 连接断开');
    }
});

async function updateAgent(agentId, updateData) {
    try {
        const { data, error } = await supabaseAdmin
            .from('agents')
            .update(updateData)
            .eq('id', agentId);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('代理更新失败:', error);
        return { success: false, error };
    }
}

module.exports = {
    supabaseAdmin,
    updateAgent
};
