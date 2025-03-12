// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, requireAgent } = require('../middlewares/auth');
const userController = require('../controllers/users');

// 所有路由都需要认证
router.use(authenticate);
router.use(requireAgent);

// 获取所有用户
router.get('/', userController.getAllUsers);

// 获取黑名单用户
router.get('/blocked', userController.getBlockedUsers);

// 获取单个用户信息
router.get('/:userId', userController.getUserInfo);

// 拉黑用户
router.post('/:userId/block', userController.blockUser);

// 解除拉黑
router.post('/:userId/unblock', userController.unblockUser);

// 获取客服的分享链接
router.get('/share-links/my', userController.getMyShareLinks);

// 创建新的分享链接
router.post('/share-links/create', userController.createShareLink);

// 获取分享链接的访问统计
router.get('/share-links/:linkId/stats', userController.getShareLinkStats);

module.exports = router;