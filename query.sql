-- 查询当前时间和用户
SELECT current_timestamp, current_user;

-- 查询所有公共表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';