// src/services/api/uploadAvatar.tsx
import { nanoid } from 'nanoid';
import { useChatStore } from '../../stores/chatStore';
import { supabase } from '../supabase';
import { useAuthStore } from '../../stores/authStore';

export const uploadAvatar = async (file: File): Promise<string> => {
  // 从chatStore获取用户类型和设置
  const { userType, userSettings } = useChatStore.getState();
  // 从authStore获取客服信息
  // 修改：移除不存在的 userData 和 updateUserData
  const { agentData, updateAgentData } = useAuthStore.getState();
  
  // 验证文件类型和大小
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件类型,请上传JPG、PNG、GIF或WEBP格式的图片');
  }
  
  const maxSize = 200 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error('文件大小不能超过200MB');
  }
  
  // 生成唯一文件名
  const fileExt = file.name.split('.').pop();
  const fileName = `${nanoid()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  try {
    // 上传到Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('上传错误:', uploadError);
      throw new Error(`上传头像失败: ${uploadError.message}`);
    }

    // 获取公共URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = data.publicUrl;

    // 根据用户类型更新头像URL
    if (userType === 'agent' && agentData?.id) {
      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar: avatarUrl })
        .eq('id', agentData.id);
        
      if (updateError) {
        console.error('更新客服头像错误:', updateError);
        throw new Error(`更新头像失败: ${updateError.message}`);
      }
      
      // 更新本地状态，使用authStore中的方法
      updateAgentData({ avatar: avatarUrl });
    } 
    else if (userType === 'user') {
      // 修改：直接使用 userSettings 中的 ID
      const userId = userSettings?.id;
      
      if (!userId) {
        throw new Error('无法确定用户ID');
      }
      
      // 确定表名 - 临时用户使用customers表
      const tableName = 'customers';
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          avatar: avatarUrl,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('更新用户头像错误:', updateError);
        throw new Error(`更新头像失败: ${updateError.message}`);
      }
      
      // 更新本地状态
      useChatStore.getState().updateUserSettings({ avatar: avatarUrl });
      
      // 修改：移除对 userData 的引用
    }

    return avatarUrl;
  } catch (error) {
    console.error('头像上传过程中发生错误:', error);
    throw error;
  }
};