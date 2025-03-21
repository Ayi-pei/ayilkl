// src/utils/idUtils.ts
import { nanoid } from 'nanoid';
import { NANOID_PREFIX } from '../types';

/**
 * 生成带前缀的唯一ID
 * @param prefix 前缀，可以使用NANOID_PREFIX中定义的常量
 * @param length ID长度，不包括前缀
 * @returns 带前缀的唯一ID
 */
export const generatePrefixedId = (prefix: string, length = 10): string => {
  return `${prefix}${nanoid(length)}`;
};

/**
 * 生成聊天相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带聊天前缀的唯一ID
 */
export const generateChatId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.CHAT, length);
};

/**
 * 生成用户相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带用户前缀的唯一ID
 */
export const generateUserId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.USER, length);
};

/**
 * 生成客服相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带客服前缀的唯一ID
 */
export const generateAgentId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.AGENT, length);
};

/**
 * 生成管理员相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带管理员前缀的唯一ID
 */
export const generateAdminId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.ADMIN, length);
};

/**
 * 生成消息相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带消息前缀的唯一ID
 */
export const generateMessageId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.MESSAGE, length);
};

/**
 * 生成快捷回复相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带快捷回复前缀的唯一ID
 */
export const generateQuickReplyId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.QUICK_REPLY, length);
};

/**
 * 生成链接相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带链接前缀的唯一ID
 */
export const generateLinkId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.LINK, length);
};

/**
 * 生成密钥相关的唯一ID
 * @param length ID长度，不包括前缀
 * @returns 带密钥前缀的唯一ID
 */
export const generateKeyId = (length = 10): string => {
  return generatePrefixedId(NANOID_PREFIX.KEY, length);
};

/**
 * 生成通用唯一ID（无前缀）
 * @param length ID长度
 * @returns 唯一ID
 */
export const generateId = (length = 21): string => {
  return nanoid(length);
};