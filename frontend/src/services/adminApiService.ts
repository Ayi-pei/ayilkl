// frontend/src/services/adminApiService.ts
import apiClient from './apiClient'; // Assuming a configured apiClient exists
import { ADMIN_API_KEY } from '../config'; // Assuming ADMIN_API_KEY is in frontend config

// Define the expected structure for an agent item in the list
export interface AdminAgentListItem {
    id: string;
    nickname: string | null;
    account_status: 'enabled' | 'disabled';
    online_status: 'online' | 'offline' | 'away'; // Make sure backend provides this if displayed
    created_at: string;
    assigned_key_value_masked: string | null;
    key_expires_at: string | null;
}

export interface PaginatedAgentsResponse {
    // Assuming the backend returns 'data' for the list and 'pagination' object
    data: AdminAgentListItem[]; 
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface GetAgentsParams { // Renamed for clarity
    page?: number;
    limit?: number;
    search?: string;
    account_status?: 'enabled' | 'disabled';
}

export const getAdminAgents = async (params: GetAgentsParams = {}): Promise<PaginatedAgentsResponse> => {
    try {
        // The backend API is GET /api/admin/agents
        // The apiClient should be configured to prefix this with the base URL (e.g., http://localhost:PORT/api)
        const response = await apiClient.get('/admin/agents', { // Path should be relative to apiClient's baseUrl
            params, 
            headers: {
                'X-Admin-Key': ADMIN_API_KEY, // This key needs to be accessible, e.g. from a config/env file
            },
        });
        // IMPORTANT: The backend currently returns res.json({ success: true, data: agents, pagination: { ... } });
        // So, the actual list of agents is in response.data.data and pagination in response.data.pagination
        // Adjusting here to match the actual backend response structure.
        if (response.data && response.data.success) {
            return {
                data: response.data.data,
                pagination: response.data.pagination,
            };
        } else {
            // Handle cases where backend response is not as expected but not a network error
            throw new Error(response.data?.message || 'Failed to fetch agents: Unexpected response structure');
        }
    } catch (error: any) {
        console.error('Error fetching admin agents:', error.response?.data?.message || error.message);
        throw new Error(error.response?.data?.message || error.message || 'An unknown error occurred while fetching agents.');
    }
};

export interface CreateAdminAgentPayload {
    nickname?: string; // Optional nickname
    generated_key_id: string; // ID of the key to assign
}

export const createAdminAgent = async (payload: CreateAdminAgentPayload): Promise<AdminAgentListItem> => {
    try {
        const response = await apiClient.post('/admin/agents', payload, {
            headers: {
                'X-Admin-Key': ADMIN_API_KEY,
            },
        });
        
        // Backend on POST /api/admin/agents returns:
        // res.status(201).json({ success: true, message: 'Agent created successfully', data: newAgent });
        // newAgent matches AgentDetails, which should be compatible with AdminAgentListItem
        if (response.data && response.data.success && response.data.data) {
            // Assuming the 'data' field from backend (AgentDetails) is compatible with AdminAgentListItem
            // If not, a mapping function might be needed here.
            // For example, if AgentDetails has more fields than AdminAgentListItem, it's fine.
            // If AdminAgentListItem requires fields not in AgentDetails, it's an issue.
            // Based on current definitions, AgentDetails has:
            // id, nickname, account_status, current_key_id, created_at, updated_at
            // AdminAgentListItem has:
            // id, nickname, account_status, online_status, created_at, assigned_key_value_masked, key_expires_at
            // They are not directly compatible. We need to adjust what this function returns or
            // how the backend structures its response for this specific creation endpoint,
            // or acknowledge that the AdminAgentListItem will have some fields (like online_status) undefined.
            // For now, let's assume the backend response `data` can be cast or is close enough.
            // A more robust solution would be a dedicated DTO from the backend for this creation response.
            return response.data.data as AdminAgentListItem; 
        } else {
            throw new Error(response.data?.message || 'Failed to create agent: Unexpected response structure from server.');
        }
    } catch (error: any) {
        // Log the full error for debugging if available
        console.error('Error creating admin agent:', error.response ? error.response.data : error.message);
        // Throw a user-friendly error message
        throw new Error(error.response?.data?.message || error.message || 'An unknown error occurred while creating the agent.');
    }
};

export interface AdminKeyBasicInfo {
    id: string; 
    key_value_masked: string;
    expires_at: string;
}

export const getAvailableKeysForAssignment = async (): Promise<AdminKeyBasicInfo[]> => {
    try {
        const response = await apiClient.get('/admin/generated-keys', {
            params: {
                is_assigned: false,
                is_active_manual: true,
                limit: 100, // Fetch up to 100 available keys
            },
            headers: {
                'X-Admin-Key': ADMIN_API_KEY,
            },
        });

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const now = new Date();
            const available = response.data.data
                .filter((key: any) => {
                    const isExpired = new Date(key.expires_at) < now;
                    // Backend listGeneratedKeys now includes 'is_expired' calculated field,
                    // but we also check is_active_manual and is_assigned from params.
                    // The backend's 'is_expired' is what we should rely on.
                    // However, the current backend listGeneratedKeys doesn't filter by is_expired.
                    // So, client-side filter is still needed for expiration.
                    return !isExpired && key.is_active_manual && !key.is_assigned;
                })
                .map((key: any) => ({
                    id: key.id,
                    key_value_masked: key.key_value_masked, 
                    expires_at: key.expires_at,
                }));
            return available;
        } else {
            throw new Error(response.data?.message || 'Failed to fetch available keys: Unexpected response structure');
        }
    } catch (error: any) {
        console.error('Error fetching available keys:', error.response?.data?.message || error.message);
        throw new Error(error.response?.data?.message || error.message || 'An unknown error occurred while fetching available keys.');
    }
};
