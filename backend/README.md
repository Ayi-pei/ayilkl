# Backend Service for Customer Service Chat System

This directory contains the Node.js (Express.js) backend service for the customer service chat system. It handles business logic, API requests, database interactions with Supabase, real-time communication setup, and administrator functionalities.

## Features

*   User authentication and management (for chat users/customers).
*   Agent authentication (for customer service agents, primarily via chat client).
*   Administrator API for managing agents and system keys.
*   Real-time WebSocket integration for chat (details may depend on original project structure or Supabase Realtime usage).
*   Interaction with Supabase for database persistence.

## Tech Stack

*   Node.js
*   Express.js
*   Supabase Client for JavaScript (`@supabase/supabase-js`)
*   `cors` for Cross-Origin Resource Sharing.
*   `express.json` and `express.urlencoded` for request body parsing.
*   `nanoid` for unique ID generation (e.g., for keys).
*   Potentially `socket.io` if WebSockets are managed directly by the Node.js server.

## Project Structure (Key Directories within `backend/src`)

*   `controllers/`: Request handlers for API routes.
    *   `adminController.js`: Handles admin-specific API requests.
*   `services/`: Business logic and interaction with data sources (Supabase).
    *   `adminService.js`: Core logic for agent and key management.
*   `routes/`: API route definitions.
    *   `adminRoutes.js`: Routes for administrator actions.
*   `middlewares/`: Custom middleware.
    *   `authAdmin.js`: Middleware for admin API key authentication.
    *   `error.js`: Global error handling middleware.
*   `utils/`: Utility functions and Supabase client initialization.
*   `config/`: Application configuration (e.g., loading environment variables).
*   `app.js`: Express application setup, middleware configuration, and route mounting.
*   `index.js`: Server startup script (entry point for the backend).

## Setup and Running

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if you use yarn:
    # yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in this `backend` directory (you can copy `.env.example` if one is provided as a template). Ensure the following variables are correctly set:
    *   `PORT`: The port on which the backend server will listen (e.g., `3001` or `8000`).
    *   `DATABASE_URL`: Your Supabase PostgreSQL connection string (usually found in Supabase project settings).
    *   `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project-id.supabase.co`).
    *   `SUPABASE_KEY`: Your Supabase `anon` public key or `service_role` secret key. For backend operations that require elevated privileges (like direct DB manipulation bypassing RLS, or admin tasks), the `service_role` key is typically used. Ensure Row Level Security (RLS) policies are appropriately configured in Supabase if using the `anon` key for broader operations.
    *   `ADMIN_API_KEY`: A secure, randomly generated secret key for authenticating access to the admin APIs (`/api/admin/*`). This key must be provided by clients in the `X-Admin-Key` HTTP header. **Do NOT use weak or default keys in production.**
    *   *(Add any other environment variables required by the original project, such as JWT secrets, etc.)*

4.  **Database Setup (Supabase):**
    *   Ensure your Supabase project has the required tables. Based on the admin module implementation, these include:
        *   `agents`: Stores information about customer service agent accounts.
        *   `generated_keys`: Stores system-generated keys that can be assigned to agents, with expiry and status.
        *   `daily_key_generation_stats`: Tracks the number of keys generated per day to enforce limits.
    *   If you are using Supabase CLI and have migration scripts in a `supabase/migrations` directory (relative to your project root or Supabase project setup), apply them:
        ```bash
        # Example using Supabase CLI (ensure you are logged in and linked to your project)
        # supabase migrations up
        ```

5.  **Running the development server:**
    ```bash
    npm run dev
    # Or, if only a 'start' script is available:
    # npm start
    ```
    The server will typically start on the port specified in your `.env` file (e.g., `http://localhost:3001`).

## API Endpoints

The backend exposes several sets of API endpoints. Key administrative endpoints are:

*   **Administrator API**: Base path `/api/admin`.
    *   Authentication: All admin endpoints require an `X-Admin-Key` header with the configured `ADMIN_API_KEY`.
    *   **Agent Management**:
        *   `GET /agents`: List agent accounts (supports pagination, search by nickname, filter by account status).
        *   `POST /agents`: Create a new agent account (requires assigning a valid `generated_key_id`).
        *   `PUT /agents/:agentId/status`: Update an agent's account status (enabled/disabled).
        *   `PUT /agents/:agentId/details`: Update an agent's details (e.g., nickname).
        *   `PUT /agents/:agentId/assign-key`: Assign or re-assign a system-generated key to an agent.
        *   `DELETE /agents/:agentId`: Delete an agent account (associated key is unassigned).
    *   **Key Management**:
        *   `GET /generated-keys`: List system-generated keys (supports pagination and various filters).
        *   `POST /generated-keys`: Generate a new key (respects daily generation limits, valid for 24 hours).
        *   `PUT /generated-keys/:keyId/status`: Manually activate or deactivate a specific generated key.

*   **API Documentation (Swagger/OpenAPI)**:
    *   If available and running, detailed API documentation can typically be accessed at `/api-docs` (e.g., `http://localhost:3001/api-docs`).

## Automated Tasks

*   **Daily Key & Agent Cleanup**: The system includes logic (`adminService.performDailyKeyCleanup()`) to automatically clean up expired keys. If an expired key was assigned to an agent, that agent account is also automatically deleted. This service function also resets the daily key generation counter.
    *   **Execution**: This function is designed to be triggered by a scheduled job (e.g., a cron job or a Supabase Scheduled Function) once per day (e.g., at midnight UTC).
    *   **Setup**: The actual scheduling mechanism is environment-dependent and needs to be configured as part of the deployment process.

## Error Handling

*   The application uses a global error handling middleware. API errors are generally returned in a JSON format:
    ```json
    {
        "success": false,
        "message": "A descriptive error message",
        "error": "Optional additional error details or context"
    }
    ```
