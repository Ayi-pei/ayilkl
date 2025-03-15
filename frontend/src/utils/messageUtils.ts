// src/utils/messageUtils.ts
import { nanoid } from 'nanoid';
import { Message } from '../types';
import { formatDateTime } from './formatUtils';

/**
 * 创建一个新的文本消息对象
 * @param content 消息内容
 * @param sender 发送者类型
 * @param recipientId 接收者ID
 * @returns 消息对象
 */
export const createTextMessage = (
  content: string,
  sender: 'user' | 'agent' | 'customer' | 'system',
  recipientId?: string
): Message => {
  return {
    id: nanoid(),
    content,
    type: 'text',
    sender,
    recipientId,
    timestamp: new Date().toISOString()
  };
};

/**
 * 创建一个新的系统消息对象
 * @param content 消息内容
 * @returns 系统消息对象
 */
export const createSystemMessage = (content: string): Message => {
  return {
    id: nanoid(),
    content,
    type: 'system',
    sender: 'system',
    timestamp: new Date().toISOString()
  };
};

/**
 * 创建一个新的图片消息对象
 * @param imageUrl 图片URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns 图片消息对象
 */
export const createImageMessage = (
  imageUrl: string,
  sender: 'user' | 'agent' | 'customer',
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return {
    id: nanoid(),
    content: imageUrl,
    type: 'image',
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp: new Date().toISOString()
  };
};

/**
 * 创建一个新的音频消息对象
 * @param audioUrl 音频URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns 音频消息对象
 */
export const createAudioMessage = (
  audioUrl: string,
  sender: 'user' | 'agent' | 'customer',
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return {
    id: nanoid(),
    content: audioUrl,
    type: 'audio',
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp: new Date().toISOString()
  };
};

/**
 * 创建一个新的文件消息对象
 * @param fileUrl 文件URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns 文件消息对象
 */
export const createFileMessage = (
  fileUrl: string,
  sender: 'user' | 'agent' | 'customer',
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return {
    id: nanoid(),
    content: fileUrl,
    type: 'file',
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp: new Date().toISOString()
  };
};

/**
 * 格式化消息时间显示
 * @param timestamp ISO格式的时间戳
 * @returns 格式化后的时间字符串
 */
export const formatMessageTime = (timestamp: string): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  // 一分钟内显示"刚刚"
  if (diffMins < 1) {
    return '刚刚';
  }
  
  // 一小时内显示"xx分钟前"
  if (diffMins < 60) {
    return `${diffMins}分钟前`;
  }
  
  // 今天内显示"HH:mm"
  if (
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear()
  ) {
    return formatDateTime(messageDate, 'HH:mm');
  }
  
  // 昨天显示"昨天 HH:mm"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear()
  ) {
    return `昨天 ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  
  // 一周内显示"周几 HH:mm"
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${weekdays[messageDate.getDay()]} ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  
  // 其他情况显示完整日期时间
  return formatDateTime(messageDate, 'YYYY-MM-DD HH:mm');
};