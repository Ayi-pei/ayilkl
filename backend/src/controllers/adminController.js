// backend/src/controllers/adminController.js
const adminService = require('../services/adminService');
const { AppError } = require('../middlewares/error');

/**
 * Handles the request to list agents.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getAgentsList = async (req, res, next) => {
    try {
        // TODO: Extract pagination and filter parameters from req.query
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            search: req.query.search, // for nickname
            account_status: req.query.account_status
        };

        const { agents, total } = await adminService.listAgents(filters);

        res.json({
            success: true,
            data: agents,
            pagination: {
                total,
                page: filters.page,
                limit: filters.limit,
                totalPages: Math.ceil(total / filters.limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles the request to create a new agent.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.createAgent = async (req, res, next) => {
    try {
        const { nickname, generated_key_id } = req.body;

        if (!generated_key_id) {
            // Ensure AppError is correctly imported and used
            return next(new AppError('Missing required field: generated_key_id', 400));
        }

        // Basic validation for generated_key_id format (e.g., is it a string)
        if (typeof generated_key_id !== 'string' || generated_key_id.trim() === '') {
             return next(new AppError('Invalid format for generated_key_id', 400));
        }

        const newAgent = await adminService.createAgent({ nickname, generated_key_id });
        res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            data: newAgent
        });
    } catch (error) {
        // Errors from services should be caught and passed to the error handling middleware
        next(error);
    }
};

/**
 * Handles the request to update an agent's account status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateAgentStatus = async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const { account_status } = req.body;

        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            return next(new AppError('Invalid or missing agentId in path parameters.', 400));
        }
        if (!account_status || !['enabled', 'disabled'].includes(account_status)) {
            return next(new AppError('Invalid or missing account_status in request body. Must be "enabled" or "disabled".', 400));
        }

        const updatedAgent = await adminService.updateAgentStatus(agentId, account_status);
        res.json({
            success: true,
            message: `Agent ${agentId} status updated to ${account_status}.`,
            data: updatedAgent // Should return the updated agent details
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles the request to update an agent's details (e.g., nickname).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateAgentDetails = async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const { nickname } = req.body; 

        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            return next(new AppError('Invalid or missing agentId in path parameters.', 400));
        }
        
        // Allow empty string for nickname, but not other types or undefined
        if (nickname === undefined || typeof nickname !== 'string') {
            return next(new AppError('Nickname must be provided as a string in the request body (can be empty).', 400));
        }

        // Potentially add length validation for nickname if needed
        // if (nickname.length > MAX_NICKNAME_LENGTH) { ... }

        const updatableDetails = { nickname }; 
        // If more details become updatable, add them to this object
        // e.g. if (avatarUrl) updatableDetails.avatar = avatarUrl;

        const updatedAgent = await adminService.updateAgentDetails(agentId, updatableDetails);
        res.json({
            success: true,
            message: `Agent ${agentId} details updated successfully.`,
            data: updatedAgent
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles the request to assign a new key to an agent.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.assignKeyToAgent = async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const { generated_key_id: newGeneratedKeyId } = req.body; // Renaming for clarity

        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            return next(new AppError('Invalid or missing agentId in path parameters.', 400));
        }
        
        if (!newGeneratedKeyId || typeof newGeneratedKeyId !== 'string' || newGeneratedKeyId.trim() === '') {
            return next(new AppError('Invalid or missing newGeneratedKeyId in request body.', 400));
        }

        const updatedAgent = await adminService.assignNewKeyToAgent(agentId, newGeneratedKeyId);
        res.json({
            success: true,
            message: `Agent ${agentId} successfully assigned new key ${newGeneratedKeyId}.`,
            data: updatedAgent
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles the request to delete an agent.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.deleteAgent = async (req, res, next) => {
    try {
        const { agentId } = req.params;

        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            return next(new AppError('Invalid or missing agentId in path parameters.', 400));
        }

        await adminService.deleteAgent(agentId);
        // Send a 200 OK with a success message, or 204 No Content. 
        // 200 is often preferred if you want to send a confirmation message.
        res.status(200).json({
            success: true,
            message: `Agent ${agentId} and its associations (like key unassignment) handled successfully.`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles the request to list generated keys.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getGeneratedKeysList = async (req, res, next) => {
    try {
        // Validate and parse filter parameters
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);

        const filters = {
            page: Number.isInteger(page) && page > 0 ? page : 1,
            limit: Number.isInteger(limit) && limit > 0 ? limit : 10,
        };

        if (req.query.is_assigned !== undefined) {
            if (req.query.is_assigned === 'true' || req.query.is_assigned === 'false') {
                filters.is_assigned = req.query.is_assigned === 'true';
            } else {
                return next(new AppError("Invalid filter 'is_assigned': must be 'true' or 'false'.", 400));
            }
        }

        if (req.query.is_active_manual !== undefined) {
             if (req.query.is_active_manual === 'true' || req.query.is_active_manual === 'false') {
                filters.is_active_manual = req.query.is_active_manual === 'true';
            } else {
                return next(new AppError("Invalid filter 'is_active_manual': must be 'true' or 'false'.", 400));
            }
        }
        
        // Add other filters like search by key_value (partial match) if desired
        if (req.query.search_key) {
            filters.search_key = String(req.query.search_key);
        }


        const result = await adminService.listGeneratedKeys(filters);

        res.json({
            success: true,
            data: result.keys, // Ensure service returns { keys, total }
            pagination: {
                total: result.total,
                page: filters.page,
                limit: filters.limit,
                totalPages: Math.ceil(result.total / filters.limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Add other admin-related controller functions here later
