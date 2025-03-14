// src/schemas/messageSchema.js
const Joi = require('joi');

// 发送消息验证模式
const sendMessageSchema = Joi.object({
  content: Joi.string().required().messages({
    'string.empty': '消息内容不能为空',
    'any.required': '消息内容是必填项'
  }),
  type: Joi.string().valid('text', 'image', 'audio').required().messages({
    'string.empty': '消息类型不能为空',
    'any.required': '消息类型是必填项',
    'any.only': '消息类型必须是 text, image 或 audio'
  }),
  recipientId: Joi.string().required().messages({
    'string.empty': '接收者ID不能为空',
    'any.required': '接收者ID是必填项'
  }),
  fileName: Joi.string().when('type', {
    is: Joi.string().valid('image', 'audio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.empty': '文件名不能为空',
    'any.required': '对于图片或音频消息，文件名是必填项'
  }),
  fileSize: Joi.number().when('type', {
    is: Joi.string().valid('image', 'audio'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'number.base': '文件大小必须是数字',
    'any.required': '对于图片或音频消息，文件大小是必填项'
  })
});

module.exports = {
  sendMessageSchema
};