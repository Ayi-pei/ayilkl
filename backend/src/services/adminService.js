// backend/src/services/adminService.js
const supabase = require('../utils/supabaseClient');
const { AppError } = require('../middlewares/error'); // Assuming AppError is used for error handling

/**
 * @typedef {Object} AgentListItem
 * @property {string} id
 * @property {string | null} nickname
 * @property {'enabled' | 'disabled'} account_status
 * @property {'online' | 'offline' | 'away'} online_status
 * @property {string} created_at
 * @property {string | null} assigned_key_value_masked
 * @property {string | null} key_expires_at
 */

/**
 * Masks a key value, showing only the last 4 characters.
 * @param {string | null} keyValue
 * @returns {string | null}
 */
const maskKeyValue = (keyValue) => {
    if (!keyValue || keyValue.length <= 4) {
        // Return a generic mask if key is too short or null, 
        // or just return as is if that's preferred.
        return '****'; 
    }
    return `********${keyValue.slice(-4)}`;
};

/**
 * Fetches a list of agents with their assigned key information.
 * @param {object} filters
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=10]
 * @param {string} [filters.search] - Search by nickname
 * @param {'enabled' | 'disabled'} [filters.account_status]
 * @returns {Promise<{agents: AgentListItem[], total: number}>}
 */
exports.listAgents = async (filters = {}) => {
    const { page = 1, limit = 10, search, account_status } = filters;

    // Base query from 'agents' table
    // Ensure your Supabase table names and column names match these (e.g., 'agents', 'generated_keys').
    // This query structure relies on a defined foreign key relationship in Supabase 
    // from 'agents.current_key_id' to 'generated_keys.id' for the nested select to work easily.
    // If 'current_key_id' is just a UUID and the relationship isn't formally defined in Supabase
    // with a foreign key constraint, a manual join approach would be needed.
    // However, Supabase client often allows this nested selection if column name conventions are followed
    // or if the relationship is hinted (e.g. agents.current_key_id references generated_keys.id).
    
    let query = supabase
        .from('agents')
        .select(`
            id,
            nickname,
            account_status,
            online_status,
            created_at,
            current_key_id, 
            generated_keys (
                key_value,
                expires_at
            )
        `, { count: 'exact' }); // Request total count for pagination

    // Apply search filter for nickname
    if (search) {
        query = query.ilike('nickname', `%${search}%`);
    }

    // Apply account_status filter
    if (account_status && ['enabled', 'disabled'].includes(account_status)) {
        query = query.eq('account_status', account_status);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Order by creation date by default
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching agents:', error.message);
        // It's good practice to check for specific Supabase errors if needed
        // e.g., if (error.code === 'PGRST200') { /* specific handling */ }
        throw new AppError('Failed to fetch agents list.', 500, error.details || error.message);
    }

    const agents = data.map(agent => ({
        id: agent.id,
        nickname: agent.nickname,
        account_status: agent.account_status,
        // Ensure 'online_status' field exists in your 'agents' table and is populated.
        // If not, this will be null or undefined.
        online_status: agent.online_status || 'offline', 
        created_at: agent.created_at,
        assigned_key_value_masked: agent.generated_keys ? maskKeyValue(agent.generated_keys.key_value) : null,
        key_expires_at: agent.generated_keys ? agent.generated_keys.expires_at : null,
    }));

    return { agents, total: count || 0 };
};

/**
 * @typedef {Object} AgentDetails
 * @property {string} id
 * @property {string | null} nickname
 * @property {'enabled' | 'disabled'} account_status
 * @property {string} current_key_id
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Creates a new agent and assigns a generated key to them.
 * @param {object} agentData
 * @param {string | null} agentData.nickname
 * @param {string} agentData.generated_key_id - The ID of the key from 'generated_keys' table.
 * @returns {Promise<AgentDetails>}
 */
exports.createAgent = async ({ nickname, generated_key_id }) => {
    // 1. Validate the generated_key_id
    const { data: keyData, error: keyError } = await supabase
        .from('generated_keys')
        .select('*')
        .eq('id', generated_key_id)
        .single();

    if (keyError || !keyData) {
        throw new AppError(`Invalid generated_key_id: Key ${generated_key_id} not found.`, 404, keyError ? keyError.message : 'Key not found');
    }

    if (!keyData.is_active_manual) {
        throw new AppError(`Key ${generated_key_id} is not active and cannot be assigned.`, 400);
    }

    if (new Date(keyData.expires_at) < new Date()) {
        throw new AppError(`Key ${generated_key_id} has expired and cannot be assigned.`, 400);
    }

    if (keyData.is_assigned) {
        throw new AppError(`Key ${generated_key_id} is already assigned to another agent (ID: ${keyData.assigned_agent_id}).`, 400);
    }

    // 2. Create the Agent
    // Ensure column names match your Supabase 'agents' table schema
    const agentPayload = {
        nickname: nickname || `Agent_${Date.now().toString().slice(-6)}`, // Default nickname if not provided
        account_status: 'enabled',
        current_key_id: generated_key_id,
        online_status: 'offline', // Default online status
        // created_at and updated_at are usually handled by Supabase automatically by default table setup
    };

    const { data: newAgent, error: agentInsertError } = await supabase
        .from('agents')
        .insert(agentPayload)
        .select() // Select all columns of the newly created agent
        .single();

    if (agentInsertError || !newAgent) {
        throw new AppError('Failed to create agent in database.', 500, agentInsertError ? agentInsertError.message : 'Agent creation returned no data');
    }

    // 3. Update the Key to mark it as assigned
    const { error: keyUpdateError } = await supabase
        .from('generated_keys')
        .update({
            is_assigned: true,
            assigned_agent_id: newAgent.id,
            // last_used_at: new Date().toISOString() // Optionally update last_used_at upon assignment
        })
        .eq('id', generated_key_id);

    if (keyUpdateError) {
        // IMPORTANT: Transactional rollback needed here in a real-world scenario.
        // If key update fails, the agent creation should ideally be rolled back.
        // Supabase Edge Functions (Database Functions) are better for true atomicity.
        // For now, we'll log the error and attempt to delete the created agent for some cleanup.
        console.error(`CRITICAL: Agent ${newAgent.id} created, but failed to update key ${generated_key_id} assignment status. Error: ${keyUpdateError.message}. Attempting to delete created agent.`);
        
        const { error: deleteAgentError } = await supabase
            .from('agents')
            .delete()
            .eq('id', newAgent.id);

        if (deleteAgentError) {
            console.error(`CRITICAL: Failed to delete agent ${newAgent.id} after key assignment failure. Manual cleanup required. Error: ${deleteAgentError.message}`);
        } else {
            console.warn(`Agent ${newAgent.id} deleted due to subsequent key assignment failure.`);
        }
        
        throw new AppError(
            `Agent creation failed during key assignment: ${keyUpdateError.message}. The operation was rolled back.`, 
            500, 
            keyUpdateError.message 
        );
    }

    // Return a subset of the new agent's details
    // Ensure the returned fields match what the 'agents' table columns are after insert.
    return {
        id: newAgent.id,
        nickname: newAgent.nickname,
        account_status: newAgent.account_status,
        current_key_id: newAgent.current_key_id,
        created_at: newAgent.created_at,
        updated_at: newAgent.updated_at,
    };
};

/**
 * Updates an agent's account status.
 * @param {string} agentId - The ID of the agent to update.
 * @param {'enabled' | 'disabled'} accountStatus - The new account status.
 * @returns {Promise<AgentDetails>} // Reusing AgentDetails for consistency
 */
exports.updateAgentStatus = async (agentId, accountStatus) => {
    // Basic validation already done in controller, but good to be defensive.
    // No need to re-validate accountStatus content here if controller does it.

    const { data: updatedAgentData, error } = await supabase
        .from('agents')
        .update({ 
            account_status: accountStatus,
            updated_at: new Date().toISOString() // Explicitly set updated_at
        })
        .eq('id', agentId)
        .select() // Fetches the updated row
        .single(); // Expects a single row to be affected/returned

    if (error) {
        // Supabase error code 'PGRST116' indicates that no rows were returned,
        // which implies the agentId was not found for an update operation on a single row.
        if (error.code === 'PGRST116') { 
            throw new AppError(`Agent with ID ${agentId} not found. Cannot update status.`, 404);
        }
        // For other database errors
        console.error(`Database error when updating agent ${agentId} status:`, error.message);
        throw new AppError(`Failed to update status for agent ${agentId}.`, 500, error.details || error.message);
    }
    
    // If data is null and no error, it might also mean not found, though PGRST116 should cover it.
    if (!updatedAgentData) { 
        throw new AppError(`Agent with ID ${agentId} not found. Update operation yielded no result.`, 404);
    }

    // Return the updated agent data, conforming to AgentDetails if possible
    // Ensure the fields match the AgentDetails typedef
    return {
        id: updatedAgentData.id,
        nickname: updatedAgentData.nickname,
        account_status: updatedAgentData.account_status,
        current_key_id: updatedAgentData.current_key_id, // This field is part of AgentDetails
        created_at: updatedAgentData.created_at,
        updated_at: updatedAgentData.updated_at,
        // online_status is not part of AgentDetails, so not returned here
        // Add other fields if AgentDetails typedef is expanded
    };
};

/**
 * Updates an agent's details (e.g., nickname).
 * @param {string} agentId - The ID of the agent to update.
 * @param {object} details - An object containing the details to update.
 * @param {string} [details.nickname] - The new nickname.
 * @returns {Promise<AgentDetails>}
 */
exports.updateAgentDetails = async (agentId, details) => {
    // Controller should validate that agentId is present and details is an object.
    // Service can validate specific detail properties if needed.

    if (!details || Object.keys(details).length === 0) {
        // This case should ideally be caught by the controller, 
        // but defensive check here is good.
        throw new AppError('No details provided for update.', 400);
    }

    const updatePayload = { ...details }; // Clone details to avoid modifying original object

    // Validate specific fields if necessary
    // For example, if nickname is the only updatable field via this function:
    if (updatePayload.nickname === undefined || typeof updatePayload.nickname !== 'string') {
        throw new AppError('Nickname must be a string and was expected in details.', 400);
    }
    // If other fields were allowed, validate them too.
    // Remove any fields from updatePayload that are not allowed to be updated via this function.
    // For now, assuming only nickname is passed and valid.

    updatePayload.updated_at = new Date().toISOString(); // Explicitly set updated_at

    const { data: updatedAgentData, error } = await supabase
        .from('agents')
        .update(updatePayload)
        .eq('id', agentId)
        .select() // Fetches the updated row
        .single(); // Expects a single row

    if (error) {
        if (error.code === 'PGRST116') { 
            throw new AppError(`Agent with ID ${agentId} not found. Cannot update details.`, 404);
        }
        console.error(`Database error when updating agent ${agentId} details:`, error.message);
        throw new AppError(`Failed to update details for agent ${agentId}.`, 500, error.details || error.message);
    }

    if (!updatedAgentData) { 
        throw new AppError(`Agent with ID ${agentId} not found after details update attempt.`, 404);
    }

    // Return the updated agent data, conforming to AgentDetails
    return {
        id: updatedAgentData.id,
        nickname: updatedAgentData.nickname,
        account_status: updatedAgentData.account_status,
        current_key_id: updatedAgentData.current_key_id,
        created_at: updatedAgentData.created_at,
        updated_at: updatedAgentData.updated_at,
    };
};

/**
 * Assigns a new generated key to an agent, unassigning the old one if present.
 * @param {string} agentId - The ID of the agent.
 * @param {string} newGeneratedKeyId - The ID of the new key to assign from 'generated_keys' table.
 * @returns {Promise<AgentDetails>}
 */
exports.assignNewKeyToAgent = async (agentId, newGeneratedKeyId) => {
    // 1. Validate the newGeneratedKeyId
    const { data: newKey, error: newKeyError } = await supabase
        .from('generated_keys')
        .select('id, expires_at, is_active_manual, is_assigned, assigned_agent_id') // Select only needed fields
        .eq('id', newGeneratedKeyId)
        .single();

    if (newKeyError || !newKey) {
        throw new AppError(`New key with ID ${newGeneratedKeyId} not found.`, 404, newKeyError ? newKeyError.message : 'Key lookup returned no data');
    }
    if (!newKey.is_active_manual) {
        throw new AppError(`New key ${newGeneratedKeyId} is not manually active and cannot be assigned.`, 400);
    }
    if (new Date(newKey.expires_at) < new Date()) {
        throw new AppError(`New key ${newGeneratedKeyId} has expired and cannot be assigned.`, 400);
    }
    if (newKey.is_assigned && newKey.assigned_agent_id !== agentId) {
        throw new AppError(`New key ${newGeneratedKeyId} is already assigned to another agent (ID: ${newKey.assigned_agent_id}).`, 400);
    }

    // 2. Fetch the agent to get their current_key_id (oldKeyId)
    const { data: agentToUpdate, error: agentFetchError } = await supabase
        .from('agents')
        .select('id, current_key_id, nickname, account_status, created_at, updated_at')
        .eq('id', agentId)
        .single();

    if (agentFetchError || !agentToUpdate) {
        throw new AppError(`Agent with ID ${agentId} not found.`, 404, agentFetchError ? agentFetchError.message : 'Agent lookup returned no data');
    }

    const oldKeyId = agentToUpdate.current_key_id;

    // 3. If the new key is the same as the old key, no database action needed.
    // Return current agent details, but ensure 'updated_at' reflects a check if that's desired.
    // For simplicity, if no change, no 'updated_at' change.
    if (oldKeyId === newGeneratedKeyId) {
        return {
            id: agentToUpdate.id,
            nickname: agentToUpdate.nickname,
            account_status: agentToUpdate.account_status,
            current_key_id: agentToUpdate.current_key_id,
            created_at: agentToUpdate.created_at,
            updated_at: agentToUpdate.updated_at, // This would be the original updated_at
        };
    }

    // --- Start "Transaction-like" Operations ---
    // Step A: Update Agent's current_key_id
    const agentUpdatePayload = { 
        current_key_id: newGeneratedKeyId,
        updated_at: new Date().toISOString() 
    };
    const { data: updatedAgentData, error: agentUpdateError } = await supabase
        .from('agents')
        .update(agentUpdatePayload)
        .eq('id', agentId)
        .select() 
        .single();

    if (agentUpdateError || !updatedAgentData) {
        throw new AppError(`Failed to update agent ${agentId} with new key.`, 500, agentUpdateError ? agentUpdateError.message : "Agent update returned no data.");
    }

    // Step B: Update New Key's Assignment
    const newKeyUpdatePayload = {
        is_assigned: true,
        assigned_agent_id: agentId,
        last_used_at: new Date().toISOString() // Mark as used upon assignment
    };
    const { error: newKeyUpdateError } = await supabase
        .from('generated_keys')
        .update(newKeyUpdatePayload)
        .eq('id', newGeneratedKeyId);

    if (newKeyUpdateError) {
        console.error(`CRITICAL: Failed to assign new key ${newGeneratedKeyId} to agent ${agentId}. Attempting to revert agent's key. Error: ${newKeyUpdateError.message}`);
        const revertAgentPayload = { current_key_id: oldKeyId, updated_at: new Date().toISOString() };
        const { error: revertError } = await supabase.from('agents').update(revertAgentPayload).eq('id', agentId);
        if (revertError) {
            console.error(`CRITICAL: Failed to revert agent's key for agent ${agentId} after new key assignment failure. Manual DB correction needed. Revert Error: ${revertError.message}`);
        }
        throw new AppError(`Failed to update new key's assignment. Agent's key assignment has been attempted to be reverted. Original error: ${newKeyUpdateError.message}`, 500);
    }

    // Step C: Unassign Old Key (if it existed and is different from the new key)
    if (oldKeyId && oldKeyId !== newGeneratedKeyId) {
        const oldKeyUpdatePayload = {
            is_assigned: false,
            assigned_agent_id: null
            // Optionally, can also update 'last_used_at' or similar for the old key here if needed.
        };
        const { error: oldKeyUpdateError } = await supabase
            .from('generated_keys')
            .update(oldKeyUpdatePayload)
            .eq('id', oldKeyId);

        if (oldKeyUpdateError) {
            console.error(`CRITICAL: Agent ${agentId} assigned new key ${newGeneratedKeyId}, but failed to unassign old key ${oldKeyId}. Manual cleanup may be required for old key. Error: ${oldKeyUpdateError.message}`);
            // Not throwing an error here as the primary operation (assigning new key) was successful.
            // This is a cleanup issue that needs monitoring/logging.
        }
    }
    // --- End "Transaction-like" Operations ---

    return { 
        id: updatedAgentData.id,
        nickname: updatedAgentData.nickname,
        account_status: updatedAgentData.account_status,
        current_key_id: updatedAgentData.current_key_id,
        created_at: updatedAgentData.created_at,
        updated_at: updatedAgentData.updated_at,
    };
};

/**
 * Deletes an agent and unassigns their currently assigned key, if any.
 * @param {string} agentId - The ID of the agent to delete.
 * @returns {Promise<void>}
 */
exports.deleteAgent = async (agentId) => {
    // 1. Fetch Agent to get current_key_id
    // It's important to know if the agent exists before attempting to operate on keys.
    const { data: agent, error: fetchError } = await supabase
        .from('agents')
        .select('id, current_key_id') // Only select what's necessary
        .eq('id', agentId)
        .single();

    // Handle case where agent is not found first
    if (fetchError && fetchError.code === 'PGRST116') { // PGRST116: "JSON object requested, but 0 rows returned"
        throw new AppError(`Agent with ID ${agentId} not found. Cannot delete.`, 404);
    }
    // Handle other potential errors during fetch
    if (fetchError) {
        console.error(`Error fetching agent ${agentId} for deletion:`, fetchError.message);
        throw new AppError(`Database error when fetching agent ${agentId} for deletion.`, 500, fetchError.details || fetchError.message);
    }
    // If !agent and no error, it's unexpected, but treat as not found.
    if (!agent) { 
        throw new AppError(`Agent with ID ${agentId} not found (no data returned). Cannot delete.`, 404);
    }

    const oldKeyId = agent.current_key_id;

    // 2. Unassign Key (if a key is assigned and oldKeyId is not null)
    if (oldKeyId) {
        const { error: keyUnassignError } = await supabase
            .from('generated_keys')
            .update({
                is_assigned: false,
                assigned_agent_id: null
                // Optionally update other fields like 'last_used_at' if meaningful here
            })
            .eq('id', oldKeyId);

        if (keyUnassignError) {
            // Log this critical error. The agent deletion will still proceed,
            // but this key might remain in an inconsistent state (assigned but agent deleted).
            // This highlights the need for database-level transactions or robust cleanup.
            console.error(`CRITICAL: Failed to unassign key ${oldKeyId} while deleting agent ${agentId}. Manual check for key ${oldKeyId} status is required. Error: ${keyUnassignError.message}`);
            // Depending on policy, you might want to stop the process here to prevent further inconsistency.
            // However, the original request was to delete the agent.
            // For now, we log and proceed with agent deletion.
        }
    }

    // 3. Delete Agent from 'agents' table
    const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

    if (deleteError) {
        console.error(`Error deleting agent ${agentId} from database:`, deleteError.message);
        // This could be due to RLS, other DB constraints, or connectivity issues.
        throw new AppError(`Failed to delete agent with ID ${agentId}.`, 500, deleteError.details || deleteError.message);
    }

    // If execution reaches here, the agent was successfully deleted.
    // No explicit return value is needed as per Promise<void>.
    // The controller handles the HTTP response.
};

/**
 * @typedef {Object} KeyListItem
 * @property {string} id
 * @property {string} key_value_masked // Admins might want to see more, or full key. For now, masked.
 * @property {string} expires_at
 * @property {boolean} is_assigned
 * @property {string | null} assigned_agent_id
 * @property {string | null} assigned_agent_nickname // From related 'agents' table
 * @property {boolean} is_active_manual
 * @property {boolean} is_expired // Calculated field: new Date(expires_at) < new Date()
 * @property {string} created_at
 * @property {string | null} last_used_at
 */

/**
 * Fetches a list of generated keys with optional filtering and pagination.
 * @param {object} filters
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=10]
 * @param {boolean} [filters.is_assigned] - Filter by assignment status.
 * @param {boolean} [filters.is_active_manual] - Filter by manual activation status.
 * @param {string} [filters.search_key] - Partial search for key_value (assumes key_value is stored as searchable text).
 * @returns {Promise<{keys: KeyListItem[], total: number}>}
 */
exports.listGeneratedKeys = async (filters = {}) => {
    const { 
        page = 1, 
        limit = 10, 
        is_assigned, 
        is_active_manual,
        search_key // Added from controller logic
    } = filters;

    // Base query from 'generated_keys' table
    // The nested select 'agents ( nickname )' relies on a defined relationship
    // in Supabase where 'generated_keys.assigned_agent_id' links to 'agents.id'.
    let query = supabase
        .from('generated_keys')
        .select(`
            id,
            key_value,
            expires_at,
            is_assigned,
            assigned_agent_id,
            is_active_manual,
            created_at,
            last_used_at,
            agents ( nickname ) 
        `, { count: 'exact' }); // 'exact' for total count matching filters

    // Apply filters
    if (is_assigned !== undefined) {
        query = query.eq('is_assigned', is_assigned);
    }
    if (is_active_manual !== undefined) {
        query = query.eq('is_active_manual', is_active_manual);
    }
    if (search_key) {
        // IMPORTANT: This assumes 'key_value' is stored as plain text. 
        // If 'key_value' is hashed, this type of search will not work.
        // A different search strategy would be needed for hashed keys (e.g., exact match if user provides full key).
        query = query.ilike('key_value', `%${search_key}%`);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Default order: newest first. Can be made configurable.
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching generated keys:', error.message);
        throw new AppError('Failed to fetch the list of generated keys.', 500, error.details || error.message);
    }

    const now = new Date(); // For calculating 'is_expired'
    const keys = data.map(key => ({
        id: key.id,
        key_value_masked: maskKeyValue(key.key_value), // Use existing helper
        expires_at: key.expires_at,
        is_assigned: key.is_assigned,
        assigned_agent_id: key.assigned_agent_id,
        // Access related data: 'agents' might be null if key is not assigned or agent deleted
        assigned_agent_nickname: key.agents ? key.agents.nickname : null, 
        is_active_manual: key.is_active_manual,
        is_expired: new Date(key.expires_at) < now, // Calculated field
        created_at: key.created_at,
        last_used_at: key.last_used_at,
    }));

    return { keys, total: count || 0 };
};

// Add other admin-related service functions here later
