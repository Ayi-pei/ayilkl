const WebSocket = require('ws');
const supabase = require('./supabaseClient');
const { decryptData } = require('./helpers');
const config = require('../config');

module.exports = (server) => {
    const wss = new WebSocket.Server({ server });

    const clients = new Map(); // 存储客户端连接
    const tempUsers = new Map(); // 存储临时用户与客服的关联

    wss.on('connection', async (ws, req) => {
        const userId = req.headers && req.headers['user-id']; // 添加检查
        const linkId = req.headers && req.headers['link-id']; // 获取短链接ID
        
        if (!userId) {
            console.error('WebSocket connection: userId is missing');
            ws.close();
            return;
        }

        // 如果有短链接ID，验证并关联临时用户与客服
        if (linkId) {
            try {
                // 验证短链接
                const { data: linkData, error } = await supabase
                    .from('share_links')
                    .select('*, agents(id, nickname, avatar, status)')
                    .eq('id', linkId)
                    .single();
                
                if (error || !linkData) {
                    console.error('WebSocket connection: invalid link ID', linkId);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: '无效的聊天链接' 
                    }));
                    ws.close();
                    return;
                }
                
                // 检查链接是否过期
                if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: '聊天链接已过期' 
                    }));
                    ws.close();
                    return;
                }
                
                // 关联临时用户与客服
                tempUsers.set(userId, {
                    agentId: linkData.agent_id,
                    linkId: linkId
                });
                
                // 通知客服有新用户通过短链接连接
                const agentId = linkData.agent_id;
                const agentWs = clients.get(agentId);
                
                if (agentWs && agentWs.readyState === WebSocket.OPEN) {
                    agentWs.send(JSON.stringify({
                        type: 'NEW_TEMP_USER',
                        userId: userId,
                        linkId: linkId,
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (error) {
                console.error('WebSocket connection: error validating link', error);
                ws.close();
                return;
            }
        }

        clients.set(userId, ws); // 存储客户端连接
        console.log(`WebSocket connection: userId ${userId} connected`);

        // 向所有客户端广播此用户的在线状态
        broadcastUserStatus(userId, 'online');

        // 监听客户端消息
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                
                switch (data.type) {
                    case 'chat':
                        // 处理临时用户的消息
                        if (tempUsers.has(userId)) {
                            const { agentId } = tempUsers.get(userId);
                            const agentWs = clients.get(agentId);
                            
                            if (agentWs && agentWs.readyState === WebSocket.OPEN) {
                                agentWs.send(JSON.stringify({ 
                                    type: 'chat', 
                                    message: data.message, 
                                    senderId: userId,
                                    isTemp: true
                                }));
                            }
                            
                            // 保存消息到数据库
                            await supabase.from('messages').insert({
                                sender_id: userId,
                                receiver_id: agentId,
                                content: data.message,
                                type: 'text',
                                timestamp: new Date().toISOString()
                            });
                            
                            break;
                        }
                        
                        // 将消息广播给其他客户端
                        clients.forEach((clientWs, clientId) => {
                            if (clientId !== userId && clientWs.readyState === WebSocket.OPEN) {
                                clientWs.send(JSON.stringify({ 
                                    type: 'chat', 
                                    message: data.message, 
                                    senderId: userId 
                                }));
                            }
                        });
                        break;
                        
                    case 'USER_BLOCKED':
                        // 广播用户被拉黑的消息
                        broadcastSystemMessage({
                            type: 'USER_BLOCKED',
                            blockedUserId: data.userId,
                            byUserId: userId,
                            timestamp: new Date().toISOString()
                        });
                        break;
                        
                    case 'USER_UNBLOCKED':
                        // 广播用户被解除拉黑的消息
                        broadcastSystemMessage({
                            type: 'USER_UNBLOCKED',
                            unblockedUserId: data.userId,
                            byUserId: userId,
                            timestamp: new Date().toISOString()
                        });
                        break;
                        
                    case 'GENERATE_SHARE_LINK':
                        // 生成分享链接
                        if (data.agentId) {
                            const linkId = await generateShareLink(data.agentId);
                            ws.send(JSON.stringify({
                                type: 'SHARE_LINK_GENERATED',
                                linkId: linkId
                            }));
                        }
                        break;
                        
                    default:
                        console.log(`WebSocket message: unknown type ${data.type} from userId ${userId}`);
                }
            } catch (error) {
                console.error(`WebSocket message: error parsing message from userId ${userId}`, error);
            }
        });

        // 监听客户端关闭
        ws.on('close', () => {
            clients.delete(userId);
            tempUsers.delete(userId);
            console.log(`WebSocket connection: userId ${userId} disconnected`);
            
            // 广播此用户的离线状态
            broadcastUserStatus(userId, 'offline');
        });

        // 监听客户端错误
        ws.on('error', (error) => {
            console.error(`WebSocket connection: error from userId ${userId}`, error);
        });
    });
    
    // 广播用户状态（在线/离线）
    function broadcastUserStatus(userId, status) {
        clients.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ 
                    type: status, 
                    userId,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    }
    
    // 广播系统消息
    function broadcastSystemMessage(message) {
        clients.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify(message));
            }
        });
    }
    
    // 生成分享链接
    async function generateShareLink(agentId) {
        try {
            const { nanoid } = require('nanoid');
            const linkId = nanoid(10);
            
            // 设置过期时间（例如7天后）
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            
            // 保存到数据库
            await supabase.from('share_links').insert({
                id: linkId,
                agent_id: agentId,
                created_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });
            
            // 更新客服的分享链接ID
            await supabase.from('agents')
                .update({ share_link_id: linkId })
                .eq('id', agentId);
                
            return linkId;
        } catch (error) {
            console.error('生成分享链接失败:', error);
            return null;
        }
    }
};