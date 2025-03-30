-- 查询当前时间和用户
SELECT current_timestamp, current_user;

-- 查询所有公共表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 增：插入操作示例
INSERT INTO some_table (column1, column2) VALUES ('value1', 'value2');

-- 改：更新操作示例
UPDATE some_table SET column1 = 'new_value' WHERE column2 = 'value2';

-- 删：删除操作示例
DELETE FROM some_table WHERE column1 = 'new_value';
