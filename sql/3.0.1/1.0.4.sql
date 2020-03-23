create table `function` (
    id int auto_increment primary key,
    name varchar(255) not null
);

create table `functionRole` (
    id int auto_increment primary key,
    roleId int not null,
    functionId int not null
); 

create table `roster` (
    id int auto_increment primary key,
    roleId int not null,
    matchId int not null,
    teamId int not null,
    userId int not null,
    status varchar(255) null
);

insert into `function` (id, name) values (1, 'homepage_view_schedule');
insert into `function` (id, name) values (2, 'homepage_view_livescores');
insert into `function` (id, name) values (3, 'assign_scorer');
insert into `function` (id, name) values (4, 'more_livescores');
insert into `function` (id, name) values (5, 'score');
insert into `function` (id, name) values (6, 'assign_umpire');
insert into `function` (id, name) values (7, 'record_attendance');


insert into `role` (id, name) values (3, 'manager');
insert into `role` (id, name) values (4, 'scorer');
insert into `role` (id, name) values (5, 'member');
insert into `role` (id, name) values (6, 'spectator');
insert into `role` (id, name) values (7, 'attendance_recorder');


insert into `functionRole` (id, roleId, functionId) values (1, 3, 1);
insert into `functionRole` (id, roleId, functionId) values (2, 3, 3);
insert into `functionRole` (id, roleId, functionId) values (3, 3, 4);
insert into `functionRole` (id, roleId, functionId) values (4, 3, 6);
insert into `functionRole` (id, roleId, functionId) values (5, 3, 7);
insert into `functionRole` (id, roleId, functionId) values (6, 4, 5);
insert into `functionRole` (id, roleId, functionId) values (7, 4, 6);
insert into `functionRole` (id, roleId, functionId) values (8, 4, 7);
insert into `functionRole` (id, roleId, functionId) values (9, 6, 2);
insert into `functionRole` (id, roleId, functionId) values (10, 7, 7);

