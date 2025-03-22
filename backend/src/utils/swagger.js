// src/utils/swagger.js
// 由于依赖问题，暂时注释掉swagger相关代码
// const swaggerJsdoc = require('swagger-jsdoc');
// const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '客服聊天系统 API',
      version: '1.0.0',
      description: '客服聊天系统的API文档',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.yourservice.com' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? '生产服务器' : '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        adminKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Admin-Key',
        },
      },
    },
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './api/*.js'
  ], // 路由文件路径
};

// 由于依赖问题，暂时提供空的导出
module.exports = {
  serve: [],
  setup: (req, res, next) => next(),
};