-- Custom SQL migration file, put you code below! --

SELECT
    *
FROM
    pg_create_logical_replication_slot('zero_slot_r1', 'pgoutput');

VACUUM;
