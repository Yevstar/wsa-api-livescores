insert into `function` (id, name) values (9, 'more_buzzer');

delete from `functionRole` where id = 13;

insert into `functionRole` (id, roleId, functionId) values (13, 3, 9);
insert into `functionRole` (id, roleId, functionId) values (14, 2, 2);
insert into `functionRole` (id, roleId, functionId) values (15, 2, 9);

update `role` set name = "admin" where id = 2;
