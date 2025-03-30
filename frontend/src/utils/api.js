import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 配置 API Key
const API_KEY = process.env.REACT_APP_API_KEY;
if (API_KEY) {
  api.defaults.headers.common['x-api-key'] = API_KEY;
}

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 如果localStorage中存在apiKey，优先使用它
    const localApiKey = localStorage.getItem('apiKey');
    if
