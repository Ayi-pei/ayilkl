// src/middlewares/validator.js
const Joi = require('joi');

/**
 * 验证请求体
 * @param {Joi.Schema} schema - Joi验证模式
 * @returns {Function} Express中间件
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

/**
 * 验证请求参数
 * @param {Joi.Schema} schema - Joi验证模式
 * @returns {Function} Express中间件
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

/**
 * 验证查询参数
 * @param {Joi.Schema} schema - Joi验证模式
 * @returns {Function} Express中间件
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery
};