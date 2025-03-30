const AgentService = require('../utils/agentService');

const updateAgentExample = async () => {
    const agentData = {
        nickname: '管理员',
        avatar: '无效的',
        status: 'online'
    };

    try {
        const result = await AgentService.updateAgent(
            'e24c9ab7-1425-43b1-8238-c6bacefa6860',
            agentData
        );

        if (result.success) {
            console.log('代理信息更新成功:', result.data);
        } else {
            console.error('代理信息更新失败:', result.error);
        }
    } catch (error) {
        console.error('更新过程发生错误:', error);
    }
};

// 运行示例
updateAgentExample().catch(console.error);
