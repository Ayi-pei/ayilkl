// src/utils/testSupabase.ts
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * 测试Supabase连接和表结构
 */
export async function testSupabaseConnection() {
  console.log('开始测试Supabase连接...');
  
  try {
    // 1. 测试基本连接
    console.log('测试基本连接...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase连接错误:', error);
    } else {
      console.log('成功连接到Supabase!', data ? '有会话' : '无会话');
    }
    
    // 2. 检查agents表是否存在
    console.log('检查agents表...');
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
      
    if (agentsError) {
      console.error('无法访问agents表:', agentsError);
    } else {
      console.log('agents表存在且可访问，数据样例:', agentsData);
    }
    
    // 3. 测试创建临时客服的权限
    console.log('测试创建权限...');
    const tempAgentId = uuidv4(); // 使用正确的UUID格式
    const { data: insertData, error: insertError } = await supabase
      .from('agents')
      .insert({
        id: tempAgentId,
        nickname: '测试客服',
        status: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (insertError) {
      console.error('创建客服权限错误:', insertError);
    } else {
      console.log('成功创建测试客服!', insertData);
      
      // 清理测试数据
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('id', tempAgentId);
        
      if (deleteError) {
        console.error('清理测试数据失败:', deleteError);
      } else {
        console.log('成功清理测试数据');
      }
    }
    
  } catch (error) {
    console.error('测试过程中出现未处理异常:', error);
  }
  
  console.log('Supabase连接测试完成');
}
