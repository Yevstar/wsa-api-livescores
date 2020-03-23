create unique index user_email_password_uindex on `user` (email, password);
create index userRoleEntity_userId_index on userRoleEntity (userId);
create index roster_matchId_index on roster (matchId);
create index team_clubId_index on team (clubId);

alter table `user` drop column club;
alter table `user` drop column teamManagerIdsJson;
