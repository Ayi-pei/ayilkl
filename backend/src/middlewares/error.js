// src/middlewares/error.js
const config = require('../config');

/**
 * 通用错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // 默认错误状态码和消息
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  
  // 处理常见错误类型
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.message === 'jwt expired') {
    statusCode = 401;
    message = '未授权访问';
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '禁止访问';
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源不存在';
    errorCode = 'NOT_FOUND';
  }
  
  // 开发环境下返回详细错误
  const errorResponse = {
    success: false,
    message,
    errorCode,
    ...(config.nodeEnv === 'development' && { 
      stack: err.stack,
      details: err.details || null
    })
  };
  
  res.status(statusCode).json(errorResponse);
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || this._getErrorCodeFromStatus(statusCode);
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  _getErrorCodeFromStatus(status) {
    const statusCodes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR'
    };
    
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }
}

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`找不到路径: ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError
};