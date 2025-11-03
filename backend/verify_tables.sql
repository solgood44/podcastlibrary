-- Quick verification query
-- Run this to check if tables and policies are set up correctly

SELECT 
    'Tables' as check_type,
    table_name,
    CASE WHEN table_name IN ('podcasts', 'episodes') THEN '✓ Found' ELSE '✗ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('podcasts', 'episodes')

UNION ALL

SELECT 
    'Policies' as check_type,
    tablename as table_name,
    CASE WHEN tablename IN ('podcasts', 'episodes') THEN '✓ Found' ELSE '✗ Missing' END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('podcasts', 'episodes')
GROUP BY tablename;

