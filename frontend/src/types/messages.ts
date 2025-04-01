export interface Message {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  recipientId?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: string;
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system'
}

export interface MessageError {
  code: string;
  message: string;
}
