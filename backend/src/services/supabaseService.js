// src/services/supabaseService.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { AppError } = require('../middlewares/error');

// 创建Supabase客户端
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * 获取用户信息
 * @param {string} userId - 用户ID
 * @returns {Promise<object>} 用户信息
 */
const getUser = async (userId) => {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
};

/**
 * 获取客服信息
 * @param {string} agentId - 客服ID
 * @returns {Promise<object>} 客服信息
 */
const getAgent = async (agentId) => {
  return await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();
};

/**
 * 通过密钥获取客服信息
 * @param {string} key - 客服密钥
 * @returns {Promise<object>} 客服信息
 */
const getAgentByKey = async (key) => {
  const { data, error } = await supabase
    .from('agent_keys')
    .select('*, agents(*)')
    .eq('key', key)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    throw new AppError('无效的客服密钥', 401);
  }
  
  // 检查密钥是否过期
  if (new Date(data.expires_at) < new Date()) {
    throw new AppError('客服密钥已过期', 401);
  }
  
  return { data, error };
};

/**
 * 创建用户
 * @param {object} userData - 用户数据
 * @returns {Promise<object>} 创建的用户
 */
const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
  
  if (error) {
    throw new AppError('创建用户失败: ' + error.message, 500);
  }
  
  return { data, error: null };
};

/**
 * 更新用户
 * @param {string} userId - 用户ID
 * @param {object} userData - 更新的用户数据
 * @returns {Promise<object>} 更新后的用户
 */
const updateUser = async (userId, userData) => {
  return await supabase
    .from('users')
    .update(userData)
    .eq('id', userId)
    .select()
    .single();
};

/**
 * 创建聊天链接
 * @param {object} linkData - 链接数据
 * @returns {Promise<object>} 创建的链接
 */
const createChatLink = async (linkData) => {
  return await supabase
    .from('chat_links')
    .insert([linkData])
    .select()
    .single();
};

/**
 * 获取客服的聊天链接
 * @param {string} agentId - 客服ID
 * @returns {Promise<Array>} 链接列表
 */
const getAgentChatLinks = async (agentId) => {
  return await supabase
    .from('chat_links')
    .select('*')
    .eq('agent_id', agentId);
};

/**
 * 通过链接ID获取聊天链接
 * @param {string} linkId - 链接ID
 * @returns {Promise<object>} 链接信息
 */
const getChatLinkById = async (linkId) => {
  return await supabase
    .from('chat_links')
    .select('*')
    .eq('link_id', linkId)
    .single();
};

/**
 * 获取用户的聊天消息
 * @param {string} userId - 用户ID
 * @param {string} agentId - 客服ID
 * @param {number} limit - 消息数量限制
 * @returns {Promise<Array>} 消息列表
 */
const getChatMessages = async (userId, agentId, limit = 100) => {
  return await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .or(`sender_id.eq.${agentId},recipient_id.eq.${agentId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
};

/**
 * 创建聊天消息
 * @param {object} messageData - 消息数据
 * @returns {Promise<object>} 创建的消息
 */
const createMessage = async (messageData) => {
  return await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();
};

/**
 * 获取用户快捷回复
 * @param {string} agentId - 客服ID
 * @returns {Promise<Array>} 快捷回复列表
 */
const getQuickReplies = async (agentId) => {
  return await supabase
    .from('quick_replies')
    .select('*')
    .eq('agent_id', agentId);
};

/**
 * 创建快捷回复
 * @param {object} replyData - 快捷回复数据
 * @returns {Promise<object>} 创建的快捷回复
 */
const createQuickReply = async (replyData) => {
  return await supabase
    .from('quick_replies')
    .insert([replyData])
    .select()
    .single();
};

/**
 * 删除快捷回复
 * @param {string} id - 快捷回复ID
 * @returns {Promise<object>} 删除结果
 */
const deleteQuickReply = async (id) => {
  return await supabase
    .from('quick_replies')
    .delete()
    .eq('id', id);
};

/**
 * 获取欢迎消息
 * @param {string} agentId - 客服ID
 * @returns {Promise<Array>} 欢迎消息
 */
const getWelcomeMessages = async (agentId) => {
  return await supabase
    .from('welcome_messages')
    .select('*')
    .eq('agent_id', agentId);
};

/**
 * 更新欢迎消息
 * @param {string} agentId - 客服ID
 * @param {Array} messages - 欢迎消息列表
 * @returns {Promise<object>} 更新结果
 */
const updateWelcomeMessages = async (agentId, messages) => {
  // 先删除现有的欢迎消息
  await supabase
    .from('welcome_messages')
    .delete()
    .eq('agent_id', agentId);
  
  // 如果没有消息，则不创建新的
  if (!messages || messages.length === 0) {
    return { data: [], error: null };
  }
  
  // 创建新的欢迎消息
  const messageObjects = messages.map((content, index) => ({
    agent_id: agentId,
    content,
    order: index
  }));
  
  return await supabase
    .from('welcome_messages')
    .insert(messageObjects)
    .select();
};

/**
 * 获取黑名单
 * @param {string} agentId - 客服ID
 * @returns {Promise<Array>} 黑名单用户ID列表
 */
const getBlacklist = async (agentId) => {
  const { data, error } = await supabase
    .from('blacklist')
    .select('user_id')
    .eq('agent_id', agentId);
  
  if (error) {
    throw new AppError('获取黑名单失败: ' + error.message, 500);
  }
  
  return { data: data.map(item => item.user_id), error: null };
};

/**
 * 添加用户到黑名单
 * @param {string} agentId - 客服ID
 * @param {string} userId - 用户ID
 * @returns {Promise<object>} 添加结果
 */
const addToBlacklist = async (agentId, userId) => {
  return await supabase
    .from('blacklist')
    .insert([{ agent_id: agentId, user_id: userId }])
    .select();
};

/**
 * 从黑名单移除用户
 * @param {string} agentId - 客服ID
 * @param {string} userId - 用户ID
 * @returns {Promise<object>} 移除结果
 */
const removeFromBlacklist = async (agentId, userId) => {
  return await supabase
    .from('blacklist')
    .delete()
    .eq('agent_id', agentId)
    .eq('user_id', userId);
};

/**
 * 检查用户是否在黑名单中
 * @param {string} agentId - 客服ID
 * @param {string} userId - 用户ID
 * @returns {Promise<boolean>} 是否在黑名单中
 */
const isUserBlacklisted = async (agentId, userId) => {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .eq('agent_id', agentId)
    .eq('user_id', userId);
  
  if (error) {
    throw new AppError('检查黑名单失败: ' + error.message, 500);
  }
  
  return data && data.length > 0;
};

/**
 * 上传文件到Supabase存储
 * @param {Buffer} fileBuffer - 文件数据
 * @param {string} fileName - 文件名
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<string>} 文件URL
 */
const uploadFile = async (fileBuffer, fileName, contentType) => {
  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(fileName, fileBuffer, {
      contentType,
      cacheControl: '3600'
    });
  
  if (error) {
    throw new AppError('文件上传失败: ' + error.message, 500);
  }
  
  // 获取文件的公共URL
  const { data: urlData } = supabase.storage
    .from('chat-files')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};

/**
 * 上传头像
 * @param {Buffer} fileBuffer - 文件数据
 * @param {string} userId - 用户ID
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<string>} 头像URL
 */
const uploadAvatar = async (fileBuffer, userId, contentType) => {
  const fileName = `avatars/${userId}_${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('user-avatars')
    .upload(fileName, fileBuffer, {
      contentType,
      cacheControl: '3600'
    });
  
  if (error) {
    throw new AppError('头像上传失败: ' + error.message, 500);
  }
  
  // 获取文件的公共URL
  const { data: urlData } = supabase.storage
    .from('user-avatars')
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
};

module.exports = {
  supabase,
  getUser,
  getAgent,
  getAgentByKey,
  createUser,
  updateUser,
  createChatLink,
  getAgentChatLinks,
  getChatLinkById,
  getChatMessages,
  createMessage,
  getQuickReplies,
  createQuickReply,
  deleteQuickReply,
  getWelcomeMessages,
  updateWelcomeMessages,
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  isUserBlacklisted,
  uploadFile,
  uploadAvatar
};