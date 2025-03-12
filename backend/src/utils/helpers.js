// src/utils/helpers.js
const crypto = require('crypto');
const { nanoid } = require('nanoid');

/**
 * 生成唯一ID
 * @param {number} length - ID长度
 * @returns {string} 唯一ID
 */
const generateId = (length = 21) => {
  return nanoid(length);
};

/**
 * 加密数据
 * @param {string} data - 要加密的数据
 * @param {string} key - 加密密钥
 * @returns {string} 加密后的数据
 */
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * 解密数据
 * @param {string} data - 加密的数据
 * @param {string} key - 解密密钥
 * @returns {string} 解密后的数据
 */
const decryptData = (data, key) => {
  const textParts = data.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

module.exports = {
  generateId,
  encryptData,
  decryptData
};