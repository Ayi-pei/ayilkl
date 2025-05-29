# Frontend for Customer Service Chat System

This directory contains the React (TypeScript, Vite) frontend application for the customer service chat system. It provides the user interface for customers, chat agents, and system administrators.

## Features

*   Real-time chat interface for customers and agents.
*   User authentication for accessing chat functionalities.
*   (Add any other existing core chat features here - *original README mentioned "响应式设计，支持移动端和桌面端" which could be added here*)
*   Responsive design, supporting mobile and desktop.

*   **New: Administrator Panel (`/admin`)**
    *   **Agent Management**: 
        *   View, search, and paginate a list of all agent accounts.
        *   Create new agent accounts, including assigning an initial system key.
        *   Edit existing agent details (e.g., nickname, account status - enabled/disabled).
        *   Assign or re-assign system keys to agents.
        *   Delete agent accounts.
    *   **System Key Management**:
        *   View, search, and paginate a list of all system-generated keys.
        *   Manually generate new keys (adhering to daily limits).
        *   Manually activate or deactivate specific keys.
        *   View key details such as expiry, assignment status, and associated agent.

## Tech Stack

*   React 18+
*   TypeScript
*   Vite (for frontend tooling)
*   Ant Design (for UI components)
*   Zustand (for state management, e.g., `authStore`)
*   `axios` (or a similar library, via `apiClient.ts`) for HTTP requests.
*   React Router DOM (for navigation).
*   Supabase (for database and real-time features - *from original README*)
*   WebSocket (*from original README*)

## Project Structure (Key Directories within `frontend/src`)

*   `pages/`: Top-level page components.
    *   `AdminPage.tsx`: The main component for the administrator dashboard.
    *   `ChatPage.tsx`, `LoginPage.tsx`, etc.
*   `components/`: Reusable UI components.
    *   `admin/`: Components specific to the admin panel (if any were created - currently most UI is in `AdminPage.tsx`).
    *   `auth/`, `common/`, `Chat/`.
*   `services/`: Modules for making API calls.
    *   `adminApiService.ts`: Functions for interacting with the backend's admin APIs.
    *   `apiClient.ts`: Configured base API client (e.g., Axios instance).
    *   `authService.ts`, etc.
*   `stores/`: State management stores (e.g., Zustand).
    *   `authStore.ts`.
*   `hooks/`: Custom React hooks.
*   `config/`: Application configuration, potentially including API keys for development.
*   `types/`: TypeScript type definitions.

## Setup and Running

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if you use yarn:
    # yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in this `frontend` directory (you can copy `.env.example` or `.env.local.example` if one is provided). At a minimum, ensure the following are set for development:
    *   `VITE_SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project-id.supabase.co`).
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase `anon` public key.
    *   `VITE_API_BASE_URL`: The base URL for your backend API (e.g., `http://localhost:3001/api` if backend runs on port 3001).
    *   `VITE_ADMIN_API_KEY`: The API key required to authenticate with the backend's admin APIs (`/api/admin/*`).
        *   **Security Note**: For development, this can be in your `.env` or `.env.local` file. **For production builds, never hardcode this key directly or commit it to your repository if the `.env` file is tracked.** Consider environment-specific build processes, runtime configuration fetched from a secure source, or having the admin input this key via a secure mechanism in the deployed application if direct embedding is unavoidable (though this is less secure).

4.  **Running the development server:**
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5173` (or another port specified by Vite).

## Accessing the Admin Panel

1.  Ensure the backend service is running and accessible.
2.  Ensure the `VITE_API_BASE_URL` and `VITE_ADMIN_API_KEY` (or your chosen method for providing it) are correctly configured in the frontend.
3.  Navigate to the `/admin` path in your browser (e.g., `http://localhost:5173/admin`).
4.  The application should authenticate using the admin API key. If successful, you will see the Admin Dashboard with "Agent Management" and "Key Management" tabs.

## Building for Production

```bash
npm run build
```
This will create a `dist` directory with the static assets for deployment. Remember to configure your production environment variables appropriately, especially regarding the `ADMIN_API_KEY`.

## Existing CI/CD & Deployment Notes

*(The following GitHub Actions workflow was present in the original README. It should be reviewed and adapted for the current project structure, especially paths and build commands if they have changed.)*

```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis
        ports:
          - 6379:6379
      postgres:
        image: postgres
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: "18"
        cache: "npm" # Assuming npm is used consistently. Change to 'yarn' if yarn is used.
    - name: Install dependencies
      # Adjust paths if your frontend/backend are not 'client'/'server' or if they are in subdirectories of 'frontend'
      run: |
        npm ci # For root, if any dependencies there
        cd frontend && npm ci # For frontend (this directory)
        # cd ../backend && npm ci # For backend, if it's part of the same CI job
    - name: Type check
      run: |
        # Adjust if your type check script is different or in a different location
        cd frontend && npm run tsc # Assuming 'tsc' script exists in frontend's package.json
    - name: Run linter
      run: |
        # Adjust if your lint script is different or in a different location
        cd frontend && npm run lint # Assuming 'lint' script exists in frontend's package.json
    - name: Run tests with coverage
      # Adjust test script and paths as needed
      run: |
        cd frontend && npm run test:coverage # Assuming test script exists
      env:
        # Ensure these are appropriate for frontend tests or remove if not needed by frontend tests
        REDIS_URL: redis://localhost:6379
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        JWT_SECRET: ${{ secrets.JWT_SECRET }}
    - name: Build
      run: |
        cd frontend && npm run build # Build the frontend
        # If backend build is needed and part of this job:
        # cd ../backend && npm run build
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2
      with:
        publish-dir: "./frontend/dist" # Adjusted to reflect frontend build output
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
        enable-pull-request-comment: true
        enable-commit-comment: true
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Older Notes on Key Management (Review Needed)

*(The following notes were present in a previous version of this README and may refer to different aspects of key management than the admin-generated system keys. They should be reviewed for current relevance.)*

```
## 密钥管理与系统设计
- 密钥存储加密：  
  // 存储加密版本而非原始密钥  
  const encryptedKey = crypto.createHash('sha256').update(original
```

```
## 密钥存储加密

// 存储加密版本而非原始密钥，实现示例如下：

const encryptedKey = crypto.createHash('sha256')
    .update(original)
    .digest('hex');
```The `frontend/README.md` file has been successfully updated by merging the new content with the existing relevant sections.

The following was done:
1.  The main structure and new information about the Admin Panel, Tech Stack, Project Structure, Setup, Accessing Admin Panel, and Building for Production were added.
2.  Relevant items from the original README's "功能特点" (Features) and "技术栈" (Tech Stack) were integrated into the new sections.
3.  The "Existing CI/CD & Deployment Notes" section was preserved, with a note added about reviewing and adapting the GitHub Actions workflow for the current project structure. Comments within the YAML block were also adjusted to reflect that it's the frontend directory.
4.  The "Older Notes on Key Management" section, including the code snippets, was preserved under a heading indicating it needs review for current relevance.

The README now provides a comprehensive overview of the frontend, including the new admin functionalities.
