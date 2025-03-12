const supabase = require('../utils/supabaseClient');
const { nanoid } = require('nanoid');
const config = require('../src/config');

// 获取用户信息
exports.getUserById = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// 创建临时用户
exports.createTempUser = async (userData) => {
    try {
        const userId = nanoid();
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('customers')
            .insert({
                id: userId,
                nickname: userData.nickname || `访客${userId.slice(0, 4)}`,
                avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
                agent_id: userData.agentId,
                ip_address: userData.ip,
                user_agent: userData.userAgent,
                first_visit: now,
                last_seen: now,
                is_temporary: true,
                source: userData.source || 'direct',
                source_id: userData.sourceId
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating temp user:', error);
        throw error;
    }
};

// 获取通过分享链接访问的用户列表
exports.getUsersByLinkId = async (linkId) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('source', 'share_link')
            .eq('source_id', linkId)
            .order('first_visit', { ascending: false });

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error fetching users by link:', error);
        throw error;
    }
};

// 更新用户最后访问时间
exports.updateLastSeen = async (userId) => {
    try {
        const { error } = await supabase
            .from('customers')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Error updating last seen:', error);
        throw error;
    }
};

// 获取客服的所有用户
exports.getAgentUsers = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('agent_id', agentId)
            .order('last_seen', { ascending: false });

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error fetching agent users:', error);
        throw error;
    }
};

// 其他用户模型方法...