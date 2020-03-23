create table incidentPlayer
(
    id int auto_increment primary key,
    incidentId int not null,
    playerId   int not null
);

create index incidentPlayer_incidentId_index on incidentPlayer (incidentId);
create index incidentPlayer_playerId_index on incidentPlayer (playerId);

insert into `function` (id, name) VALUES (11, 'field_positions');
INSERT INTO functionRole (roleId, functionId) VALUES (3, 11);
INSERT INTO functionRole (roleId, functionId) VALUES (4, 11);

alter table incident drop column playerId;
