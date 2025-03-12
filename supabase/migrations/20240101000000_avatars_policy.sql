-- PostgreSQL
CREATE POLICY "Avatar uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.filename(name) LIKE auth.uid() || '-%')
);

CREATE POLICY "Avatar updates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.filename(name) LIKE auth.uid() || '-%')
);

CREATE POLICY "Avatar deletes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.filename(name) LIKE auth.uid() || '-%')
);

-- 添加读取策略，允许所有人查看头像
CREATE POLICY "Avatar reads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);