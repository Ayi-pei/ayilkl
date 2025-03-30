# 客服聊天系统前端

这是一个基于 React 和 Supabase 构建的客服聊天系统前端项目。该系统允许客服人员与用户进行实时聊天，并提供管理后台进行客服和密钥管理。

## 功能特点

- 实时聊天功能
- 客服管理
- 密钥管理系统
- 数据统计仪表盘
- 响应式设计，支持移动端和桌面端

## 技术栈

- React
- TypeScript
- Ant Design
- Supabase (数据库和实时功能)
- WebSocket

## 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/yourusername/customer-service-chat.git
cd customer-service-chat/frontend
```

2.前端运行：进入 frontend 目录，执行 `npm install` 或 `yarn` 安装依赖，然后运行 `npm run dev` 或 `yarn dev` 启

动开发服务器  
3. 后端运行：进入 backend 目录，执行 `npm install` 安装依赖，然后运行 `npm start` 或 `node server.js` 启动服务器  
4. 使用 Docker：在项目根目录执行 `docker-compose up` 可同时启动前后端服务  
5. 请确保已配置好 .env 文件中的环境变量（如 Supabase、JWT 等配置）

## CI/CD & 部署

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
        cache: "npm"
    - name: Install dependencies
      run: |
        npm ci
        cd server && npm ci
        cd ../client && npm ci
    - name: Type check
      run: |
        npm run tsc --workspaces
    - name: Run linter
      run: |
        npm run lint
        cd server && npm run lint
        cd ../client && npm run lint
    - name: Run tests with coverage
      run: |
        npm run test:coverage
        cd server && npm run test:coverage
        cd ../client && npm run test:coverage
      env:
        REDIS_URL: redis://localhost:6379
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        JWT_SECRET: ${{ secrets.JWT_SECRET }}
    - name: Build
      run: |
        cd client && npm run build
        cd ../server && npm run build
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2
      with:
        publish-dir: "./client/dist"
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
        enable-pull-request-comment: true
        enable-commit-comment: true
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 密钥管理与系统设计

- 密钥存储加密：  
  // 存储加密版本而非原始密钥  
  const encryptedKey = crypto.createHash('sha256').update(original

## 密钥存储加密

// 存储加密版本而非原始密钥，实现示例如下：

const encryptedKey = crypto.createHash('sha256')
    .update(original)
    .digest('hex');
