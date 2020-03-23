insert into `role` (id, name) values (8, 'player');
insert into `role` (id, name) values (9, 'parent');

update `role` set name = "super_admin" where id = 1;

insert into entityType (`id`, `name`, `created_at`, `updated_at`) values (5, 'PLAYER', default, default);

INSERT INTO functionRole (roleId, functionId) VALUES (8, 1);
INSERT INTO functionRole (roleId, functionId) VALUES (8, 4);
