insert into entityType (`id`, `name`, `created_at`, `updated_at`) values (4, 'USER', default, default);

update `match` set  totalPausedMs = 0 where totalPausedMs is null;
alter table `match` modify totalPausedMs int default 0 not null;

create index userDevice_deviceId_index on userDevice (deviceId);

ALTER TABLE userDevice ADD COlUMN created_at timestamp NOT NULL DEFAULT current_timestamp();
ALTER TABLE userDevice ADD COlUMN updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

UPDATE gamePosition SET id = 0 WHERE id = 11;
alter table gameTimeAttendance alter column positionId set default 0;
