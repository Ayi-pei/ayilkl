// src/utils/messageUtils.ts
import { Message } from '../types';
import { formatDateTime } from './formatUtils';
import { generateMessageId } from './idUtils';

/**
 * 消息类型枚举
 * 与数据库模型和API保持一致
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file',
  ZIP = 'zip',
  EXE = 'exe',
  SYSTEM = 'system',
  VIDEO = 'video',  // 添加视频类型
  LOCATION = 'location'  // 添加位置类型
}

/**
 * 发送者类型枚举
 * 与数据库模型和API保持一致
 */
export enum SenderType {
  USER = 'user',
  AGENT = 'agent',
  CUSTOMER = 'customer',
  SYSTEM = 'system',
  BOT = 'bot'  // 添加机器人类型
}

/**
 * 语言类型
 */
export enum LanguageType {
  ZH = 'zh',  // 中文
  EN = 'en'   // 英文
}

/**
 * 语言文本映射
 */
const languageTextMap = {
  [LanguageType.ZH]: {
    justNow: '刚刚',
    minutesAgo: '分钟前',
    yesterday: '昨天',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    weekPrefix: '周'
  },
  [LanguageType.EN]: {
    justNow: 'just now',
    minutesAgo: 'minutes ago',
    yesterday: 'Yesterday',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekPrefix: ''
  }
};

/**
 * 创建一个新的文本消息对象
 * @param content 消息内容
 * @param sender 发送者类型
 * @param recipientId 接收者ID
 * @returns 消息对象
 */
export const createTextMessage = (
  content: string,
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content,
    type: MessageType.TEXT,
    sender,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 创建一个新的系统消息对象
 * @param content 消息内容
 * @returns 系统消息对象
 */
export const createSystemMessage = (content: string): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content,
    type: MessageType.SYSTEM,
    sender: SenderType.SYSTEM,
    timestamp,
    createdAt: timestamp
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
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: imageUrl,
    type: MessageType.IMAGE,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
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
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: audioUrl,
    type: MessageType.AUDIO,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
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
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: fileUrl,
    type: MessageType.FILE,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 创建一个新的ZIP文件消息对象
 * @param fileUrl 文件URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns ZIP文件消息对象
 */
export const createZipMessage = (
  fileUrl: string,
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: fileUrl,
    type: MessageType.ZIP,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 创建一个新的可执行文件消息对象
 * @param fileUrl 文件URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns 可执行文件消息对象
 */
export const createExeMessage = (
  fileUrl: string,
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: fileUrl,
    type: MessageType.EXE,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 格式化消息时间显示
 * @param timestamp ISO格式的时间戳
 * @param language 语言类型，默认为中文
 * @returns 格式化后的时间字符串
 */
export const formatMessageTime = (timestamp: string, language: LanguageType = LanguageType.ZH): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  const langText = languageTextMap[language];

  // 一分钟内显示"刚刚"或"just now"
  if (diffMins < 1) {
    return langText.justNow;
  }
  
  // 一小时内显示"xx分钟前"或"xx minutes ago"
  if (diffMins < 60) {
    return language === LanguageType.ZH
      ? `${diffMins}${langText.minutesAgo}`
      : `${diffMins} ${langText.minutesAgo}`;
  }
  
  // 今天内显示"HH:mm"
  if (
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear()
  ) {
    return formatDateTime(messageDate, 'HH:mm');
  }
  
  // 昨天显示"昨天 HH:mm"或"Yesterday HH:mm"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear()
  ) {
    return `${langText.yesterday} ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  
  // 一周内显示"周几 HH:mm"或"Sun HH:mm"
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const weekday = langText.weekdays[messageDate.getDay()];
    return language === LanguageType.ZH
      ? `${langText.weekPrefix}${weekday} ${formatDateTime(messageDate, 'HH:mm')}`
      : `${weekday} ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  
  // 其他情况显示完整日期时间
  return formatDateTime(messageDate, 'YYYY-MM-DD HH:mm');
};

/**
 * 获取消息的时间戳
 * @param message 消息对象
 * @returns ISO格式的时间戳
 */
export const getMessageTimestamp = (message: Message): string => {
  // 兼容同时使用timestamp和createdAt的情况
  return message.timestamp || (message.createdAt as string) || new Date().toISOString();
}

/**
 * 创建一个新的视频消息对象
 * @param videoUrl 视频URL
 * @param sender 发送者类型
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param recipientId 接收者ID
 * @returns 视频消息对象
 */
export const createVideoMessage = (
  videoUrl: string,
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: videoUrl,
    type: MessageType.VIDEO,
    sender,
    fileName,
    fileSize,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 创建一个新的位置消息对象
 * @param locationData 位置数据，格式为 "latitude,longitude"
 * @param sender 发送者类型
 * @param locationName 位置名称
 * @param recipientId 接收者ID
 * @returns 位置消息对象
 */
export const createLocationMessage = (
  locationData: string,
  sender: SenderType | 'user' | 'agent' | 'customer' | 'system' | 'bot',
  locationName?: string,
  recipientId?: string
): Message => {
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content: locationData,
    type: MessageType.LOCATION,
    sender,
    fileName: locationName,
    recipientId,
    timestamp,
    createdAt: timestamp
  };
};