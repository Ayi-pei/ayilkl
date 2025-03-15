// src/services/linkGenerator.ts
import { nanoid } from 'nanoid';
import CryptoJS from 'crypto-js';
import { TokenData } from '../types'; // 正确导入TokenData类型

/**
 * 链接生成器 - 负责生成唯一的分享链接和加密token
 */
export class LinkGenerator {
  private static readonly encryptionKey = import.meta.env.VITE_LINK_ENCRYPTION_KEY || 'default-secret-key';

  /**
   * 生成唯一的链接ID
   * @param prefix 可选前缀
   * @param length ID长度
   * @returns 唯一链接ID
   */
  static generateLinkId(prefix: string = '', length: number = 10): string {
    return prefix + nanoid(length);
  }

  /**
   * 为链接生成加密token
   * @param data 需要加密的数据 (类型为 TokenData)
   * @returns 加密后的安全token
   */
  static generateEncryptedToken(data: TokenData): string {
    // 加密数据
    const encryptedToken = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      this.encryptionKey
    ).toString();

    // 生成URL安全的token（替换URL不安全的字符）
    return encryptedToken
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * 解密token
   * @param token 加密的token
   * @returns 解密后的数据 (类型为 TokenData 或 null)
   */
  static decryptToken(token: string): TokenData | null {
    try {
      // 将URL安全字符替换回来
      const normalizedToken = token
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // 解密
      const decryptedBytes = CryptoJS.AES.decrypt(normalizedToken, this.encryptionKey);
      const decryptedData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));

      // 修正:  确保解密后的数据符合 TokenData 接口 (可选，运行时类型检查)
      // 可以添加运行时类型检查，但这里为了简洁省略
      // if (!this.isValidTokenData(decryptedData)) {
      //   console.error('解密后的数据不符合 TokenData 接口:', decryptedData);
      //   return null;
      // }

      return decryptedData as TokenData; // 类型断言为 TokenData
    } catch (error) {
      console.error('解密token失败:', error);
      return null;
    }
  }

  /**
   * 生成完整的分享链接
   * @param baseUrl 基础URL
   * @param linkId 链接ID
   * @returns 完整URL
   */
  static generateFullLink(baseUrl: string, linkId: string): string {
    // 确保baseUrl以/结尾
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

    // 组成完整链接并保证是纯文本（防止XSS）
    return `${normalizedBaseUrl}${linkId}`.replace(/<[^>]*>?/gm, '');
  }

  // 可选的运行时类型检查函数 (如果需要更严格的类型验证)
  // private static isValidTokenData(data: any): data is TokenData {
  //   return (
  //     typeof data === 'object' &&
  //     data !== null &&
  //     typeof data.agentId === 'string' &&
  //     typeof data.linkId === 'string' &&
  //     typeof data.expiresAt === 'number' &&
  //     typeof data.createdAt === 'number'
  //   );
  // }
}