// src/services/keyManager.ts
import { nanoid } from 'nanoid';
import CryptoJS from 'crypto-js';
import { KeyScope, KeyPurpose } from '../types';

/**
 * 密钥管理服务
 * 负责生成、存储和验证各种用途的密钥
 */
class KeyManagerService {
  private secretKey: string;
  private keyCache: Map<string, { value: string, expires: number, metadata?: any }>;
  
  constructor() {
    // 从环境变量或本地存储获取主密钥
    this.secretKey = import.meta.env.VITE_LINK_ENCRYPTION_KEY || 'default-encryption-key';
    this.keyCache = new Map();
    
    // 每天自动生成新的主密钥
    this.initializeDailyKey();
  }
  
  /**
   * 初始化或获取每日主密钥
   */
  private initializeDailyKey(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `daily_master_key_${today}`;
    
    // 检查是否已有今日密钥
    let dailyKey = localStorage.getItem(storageKey);
    
    if (!dailyKey) {
      // 生成新的每日密钥 (50个字符)
      dailyKey = nanoid(50);
      localStorage.setItem(storageKey, dailyKey);
      
      // 清理旧密钥缓存
      this.keyCache.clear();
    }
    
    return dailyKey;
  }
  
  /**
   * 为特定作用域生成密钥
   */
  generateKey(scope: KeyScope, purpose: KeyPurpose, expiresInHours = 24): string {
    const dailyKey = this.initializeDailyKey();
    const timestamp = Date.now();
    const randomPart = nanoid(8);
    
    // 组合信息生成密钥
    const rawKey = `${dailyKey}:${scope}:${purpose}:${timestamp}:${randomPart}`;
    
    // 使用 CryptoJS 加密
    const encryptedKey = CryptoJS.AES.encrypt(rawKey, this.secretKey).toString();
    
    // 计算过期时间
    const expires = timestamp + (expiresInHours * 60 * 60 * 1000);
    
    // 缓存密钥
    const cacheKey = `${scope}:${purpose}`;
    this.keyCache.set(cacheKey, { value: encryptedKey, expires });
    
    return encryptedKey;
  }
  
  /**
   * 注册外部生成的密钥
   * 用于将API验证的密钥注册到本地管理系统
   */
  registerExternalKey(key: string, scope: KeyScope, purpose: KeyPurpose, metadata?: any): void {
    const cacheKey = `${scope}:${purpose}:external`;
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 默认24小时
    
    this.keyCache.set(cacheKey, { 
      value: key, 
      expires,
      metadata 
    });
  }
  
  /**
   * 验证密钥是否有效
   */
  verifyKey(key: string, scope: KeyScope, purpose: KeyPurpose): boolean {
    try {
      // 先检查是否是注册的外部密钥
      const externalCacheKey = `${scope}:${purpose}:external`;
      const externalCached = this.keyCache.get(externalCacheKey);
      
      if (externalCached && externalCached.value === key && externalCached.expires > Date.now()) {
        return true;
      }
      
      // 解密密钥
      const decrypted = CryptoJS.AES.decrypt(key, this.secretKey).toString(CryptoJS.enc.Utf8);
      
      // 解析密钥组成部分
      const [dailyKey, keyScope, keyPurpose, timestamp, randomPart] = decrypted.split(':');
      
      // 验证作用域和用途
      if (keyScope !== scope || keyPurpose !== purpose) {
        return false;
      }
      
      // 验证是否过期
      const keyTime = parseInt(timestamp, 10);
      return !isNaN(keyTime) && keyTime > Date.now();
      
    } catch (error) {
      console.error('密钥验证失败:', error);
      return false;
    }
  }
  
  /**
   * 获取特定作用域的当前有效密钥
   */
  getCurrentKey(scope: KeyScope, purpose: KeyPurpose): string | null {
    const cacheKey = `${scope}:${purpose}`;
    const cached = this.keyCache.get(cacheKey);
    
    // 检查缓存中是否有有效密钥
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    // 没有有效密钥，生成新密钥
    return this.generateKey(scope, purpose);
  }
  
  /**
   * 清除所有会话相关的密钥
   * 用于注销时清理
   */
  clearSessionKeys(): void {
    // 清除所有AUTH和SESSION类型的密钥
    for (const [key, value] of this.keyCache.entries()) {
      if (key.includes(`:${KeyPurpose.AUTH}:`) || key.includes(`:${KeyPurpose.SESSION}:`)) {
        this.keyCache.delete(key);
      }
    }
  }
}

// 导出单例实例
export const KeyManager = new KeyManagerService();