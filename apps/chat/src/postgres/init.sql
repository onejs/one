SELECT 'CREATE DATABASE onechat'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'onechat')\gexec

SELECT 'CREATE DATABASE onechat_cvr'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'onechat_cvr')\gexec

SELECT 'CREATE DATABASE onechat_cdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'onechat_cdb')\gexec 