// src/utils/messageUtils.ts
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { formatDateTime } from './formatUtils';

/**
 * 消息类型枚举，与数据库模型和 API 保持一致
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file',
  ZIP = 'zip',
  EXE = 'exe',
  SYSTEM = 'system',
  VIDEO = 'video',
  LOCATION = 'location'
}

/**
 * 发送者类型枚举，与数据库模型和 API 保持一致
 */
export enum SenderType {
  USER = 'user',
  AGENT = 'agent',
  CUSTOMER = 'customer',
  SYSTEM = 'system',
  BOT = 'bot'
}

/**
 * 语言类型枚举
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
 * 生成唯一消息ID
 */
export const generateMessageId = (): string => {
  // 使用uuid库生成更高唯一性的ID
  return uuidv4();
};

/**
 * 规范化发送者类型
 * 根据不同的消息类型和场景调整发送者类型
 */
function normalizeSender(sender: SenderType, type: MessageType): SenderType {
  // 例如：对于EXE类型，如果发送者为BOT，则转换为USER
  if (sender === SenderType.BOT && type === MessageType.EXE) {
    return SenderType.USER;
  }
  // 未来可添加更多规则
  return sender;
}

/**
 * 通用的消息创建函数
 */
export const createMessage = (
  type: MessageType,
  content: string,
  sender: SenderType,
  recipientId?: string,
  fileName?: string,
  fileSize?: number
): Message => {
  const normalizedSender = normalizeSender(sender, type);
  const timestamp = new Date().toISOString();
  return {
    id: generateMessageId(),
    content,
    type,
    sender: normalizedSender,
    recipientId,
    fileName,
    fileSize,
    timestamp,
    createdAt: timestamp
  };
};

/**
 * 创建一个新的文本消息对象
 */
export const createTextMessage = (
  content: string,
  sender: SenderType,
  recipientId?: string
): Message => {
  return createMessage(MessageType.TEXT, content, sender, recipientId);
};

/**
 * 创建一个新的系统消息对象
 */
export const createSystemMessage = (content: string): Message => {
  return createMessage(MessageType.SYSTEM, content, SenderType.SYSTEM);
};

/**
 * 创建一个新的图片消息对象
 */
export const createImageMessage = (
  imageUrl: string,
  sender: SenderType,
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.IMAGE, imageUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的音频消息对象
 */
export const createAudioMessage = (
  audioUrl: string,
  sender: SenderType,
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.AUDIO, audioUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的文件消息对象
 */
export const createFileMessage = (
  fileUrl: string,
  sender: SenderType,
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.FILE, fileUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的ZIP文件消息对象
 */
export const createZipMessage = (
  fileUrl: string,
  sender: SenderType,
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.ZIP, fileUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的可执行文件消息对象
 */
export const createExeMessage = (
  fileUrl: string,
  sender: SenderType,
  fileName: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.EXE, fileUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的视频消息对象
 */
export const createVideoMessage = (
  videoUrl: string,
  sender: SenderType,
  fileName?: string,
  fileSize?: number,
  recipientId?: string
): Message => {
  return createMessage(MessageType.VIDEO, videoUrl, sender, recipientId, fileName, fileSize);
};

/**
 * 创建一个新的位置消息对象
 */
export const createLocationMessage = (
  locationData: string,
  sender: SenderType,
  locationName?: string,
  recipientId?: string
): Message => {
  return createMessage(MessageType.LOCATION, locationData, sender, recipientId, locationName);
};

/**
 * 判断日期是否为昨天
 */
const isYesterday = (date: Date, now: Date): boolean => {
  const y1 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const y2 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return (y1 - y2) === 86400000; // 24小时的毫秒数
};

/**
 * 格式化消息时间显示
 */
export const formatMessageTime = (timestamp: string, language: LanguageType = LanguageType.ZH): string => {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const langText = languageTextMap[language];

  if (diffMins < 1) {
    return langText.justNow;
  }
  if (diffMins < 60) {
    return language === LanguageType.ZH
      ? `${diffMins}${langText.minutesAgo}`
      : `${diffMins} ${langText.minutesAgo}`;
  }
  if (
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear()
  ) {
    return formatDateTime(messageDate, 'HH:mm');
  }
  if (isYesterday(messageDate, now)) {
    return `${langText.yesterday} ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const weekday = langText.weekdays[messageDate.getDay()];
    return language === LanguageType.ZH
      ? `${langText.weekPrefix}${weekday} ${formatDateTime(messageDate, 'HH:mm')}`
      : `${weekday} ${formatDateTime(messageDate, 'HH:mm')}`;
  }
  return formatDateTime(messageDate, 'YYYY-MM-DD HH:mm');
};

/**
 * 获取消息的时间戳
 */
export const getMessageTimestamp = (message: Message): string => {
  return message.timestamp ?? message.createdAt ?? new Date().toISOString();
};