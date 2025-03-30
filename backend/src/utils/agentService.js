const { supabaseAdmin } = require('./supabaseAdminClient');
const config = require('../config');

class AgentService {
    static validateAgentData(data) {
        const errors = [];
        if (data.nickname && data.nickname.length > config.agent.maxNicknameLength) {
            errors.push(`昵称长度不能超过${config.agent.maxNicknameLength}个字符`);
        }
        if (data.status && !config.agent.validStatuses.includes(data.status)) {
            errors.push(`状态必须是以下之一: ${config.agent.validStatuses.join(', ')}`);
        }
        return errors;
    }

    static async updateAgent(agentId, updateData) {
        try {
            const errors = this.validateAgentData(updateData);
            if (errors.length > 0) {
                return { success: false, error: errors.join('; ') };
            }

            const { data, error } = await supabaseAdmin
                .from(config.database.tables.agents)
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', agentId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('代理更新失败:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AgentService;
