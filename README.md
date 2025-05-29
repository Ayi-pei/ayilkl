# Customer Service Chat System (客服聊天系统)

This project is a full-stack customer service chat system featuring a React-based frontend for user and administrator interaction, and a Node.js (Express.js) backend for API services, business logic, and data persistence via Supabase.

A key feature of this system is a **comprehensive Administrator Panel** for managing customer service agents and system access keys.

## Overview

This system allows real-time chat communication between customers and support agents. Administrators have dedicated tools to manage agent accounts (creation, editing, deletion, key assignment) and the lifecycle of system-generated access keys (generation, activation/deactivation, automated cleanup).

## Modules

*   **Frontend Application (`./frontend`)**
    *   Provides the UI for customer chat, agent chat (if applicable), and the administrator management console.
    *   Built with React, TypeScript, Vite, and Ant Design.
    *   For detailed information on setup, running, and features, please see the [Frontend README](./frontend/README.md).

*   **Backend Service (`./backend`)**
    *   Provides the API endpoints for all system functionalities, including chat, user authentication, and extensive administrator operations.
    *   Built with Node.js, Express.js, and interacts with a Supabase PostgreSQL database.
    *   For detailed information on setup, running, API endpoints, and automated tasks, please see the [Backend README](./backend/README.md).

## Core Features

*   Real-time customer-agent chat.
*   User authentication.
*   **Administrator Panel Features**:
    *   **Agent Management**: Create, view, edit, and delete agent accounts. Assign and manage keys for agents.
    *   **Key Management**: Generate, view, activate/deactivate system access keys. Includes daily generation limits and automated cleanup of expired keys (and associated agents).

## Tech Stack Highlights

*   **Frontend**: React, TypeScript, Vite, Ant Design, Zustand (for state management).
*   **Backend**: Node.js, Express.js, Supabase (PostgreSQL, Auth, Realtime potential).
*   **Database**: PostgreSQL via Supabase.
*   **Real-time Communication**: Leverages Supabase Realtime or direct WebSockets (e.g., Socket.IO integrated with the backend).

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended, e.g., 18.x or 20.x).
*   npm or yarn.
*   Access to a Supabase project (or local Supabase instance via Supabase CLI).
*   Docker and Docker Compose (recommended for easier multi-service startup).

### Environment Configuration (Crucial)

Both the frontend and backend modules require specific environment variables to be set up (e.g., Supabase credentials, API ports, Admin API Key). 

*   Refer to `backend/.env.example` (if available) and `backend/README.md` for backend configuration.
*   Refer to `frontend/.env.example` (if available) and `frontend/README.md` for frontend configuration.

**The `ADMIN_API_KEY` is particularly important for accessing backend administrative functions and must be kept secure.**

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Backend Setup & Start:**
    *   Navigate to the backend: `cd backend`
    *   Follow instructions in `backend/README.md` (install dependencies, set up `.env`, start server).

3.  **Frontend Setup & Start:**
    *   Navigate to the frontend: `cd frontend` (from root, or `cd ../frontend` if in backend)
    *   Follow instructions in `frontend/README.md` (install dependencies, set up `.env`, start dev server).

4.  **Using Docker Compose (Recommended for Integrated Startup)**:
    A `docker-compose.yml` file is provided at the project root. This is often the easiest way to start both services together if configured correctly.
    ```bash
    # Ensure your .env files in backend/ and frontend/ are configured as they might be used by the Docker setup.
    docker-compose up --build -d 
    ```
    This will build the images (if not already built) and start the services in detached mode. Check the `docker-compose.yml` for exposed ports (e.g., frontend on `http://localhost:5173`, backend API on `http://localhost:3001`).

## Accessing the Application

*   **Frontend (Chat/User Interface)**: Typically `http://localhost:5173` (or as specified by Vite).
*   **Backend API**: Typically `http://localhost:3001` (or as specified in backend config).
*   **Admin Panel**: Access via the frontend at `http://localhost:5173/admin` (ensure backend is running and admin API key is correctly configured in the frontend setup).
*   **API Documentation (Swagger)**: If the backend is running, usually at `http://localhost:3001/api-docs`.

## Supabase Integration

This project relies on Supabase for its database backend and potentially for authentication and real-time messaging. Ensure your Supabase project is set up correctly with the necessary tables (see `backend/README.md` for details on admin-related tables like `agents`, `generated_keys`).

## Important Notes

*   **Security**: For any production or publicly accessible deployment, ensure all API keys, secrets, and database credentials are kept secure and are not hardcoded. Always use HTTPS. The default `ADMIN_API_KEY` in the backend must be changed for production.
*   **Automated Tasks**: The daily cleanup task for expired keys and agents (`performDailyKeyCleanup` in the backend) requires a scheduler (like cron or a cloud function scheduler) to be configured in your deployment environment to run regularly.

*(Any other high-level notes or disclaimers can be added here.)*
