// backend/src/routes/adminRoutes.js
const express = require('express');
const adminController = require('../controllers/adminController');
const authAdmin = require('../middlewares/authAdmin');

const router = express.Router();

// Protect all routes in this file with the admin authentication middleware
router.use(authAdmin);

// Route for listing agents
router.get('/agents', adminController.getAgentsList);

router.post('/agents', adminController.createAgent);

router.put('/agents/:agentId/status', adminController.updateAgentStatus);

router.put('/agents/:agentId/details', adminController.updateAgentDetails);

router.put('/agents/:agentId/assign-key', adminController.assignKeyToAgent);

router.delete('/agents/:agentId', adminController.deleteAgent);

router.get('/generated-keys', adminController.getGeneratedKeysList);

router.post('/generated-keys', adminController.generateNewKey);

router.put('/generated-keys/:keyId/status', adminController.updateKeyStatus);

// Add other admin routes here later:
// ... and so on for keys etc.

module.exports = router;
