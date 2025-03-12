// src/components/common/Toast.tsx
import { nanoid } from 'nanoid'; // 使用已在项目中的nanoid替代uuid
import { toast as reactToast, ToastContainer as ReactToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 全局Toast接口
export const toast = {
  success: (message: string) => reactToast.success(message, {
    toastId: nanoid(), // 使用nanoid生成唯一ID
  }),
  error: (message: string) => reactToast.error(message, {
    toastId: nanoid(),
  }),
  info: (message: string) => reactToast.info(message, {
    toastId: nanoid(),
  }),
  warning: (message: string) => reactToast.warning(message, {
    toastId: nanoid(),
  }),
  // 添加一个用于分享链接通知的特殊样式
  share: (message: string) => reactToast.info(message, {
    toastId: nanoid(),
    className: 'share-link-toast',
    icon: '🔗'
  }),
};

// 导出ToastContainer组件以在App.tsx中使用
export const ToastContainer = ReactToastContainer;