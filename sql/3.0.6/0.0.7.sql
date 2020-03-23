create table incidentType
(
    id int auto_increment primary key,
    name varchar(64) not null,
    icon varchar(32) not null
);

INSERT INTO incidentType (`name`, `icon`) VALUES ('Yellow Card', 'yellow');
INSERT INTO incidentType (`name`, `icon`) VALUES ('Red Card', 'red');
INSERT INTO incidentType (`name`, `icon`) VALUES ('Injury', 'injury');
INSERT INTO incidentType (`name`, `icon`) VALUES ('Spectator', 'spectator');

create table incident
(
    id int auto_increment primary key,
    matchId int NOT NULL,
    competitionId int NOT NULL,
    teamId int NOT NULL,
    playerId int NOT NULL,
    incidentTypeId int NOT NULL,
    description varchar(255) null,
    createdAt timestamp default current_timestamp not null
);

create index incident_matchId_index on incident (matchId);
create index incident_competitionId_index on incident (competitionId);
create index incident_teamId_index on incident (teamId);
create index incident_playerId_index on incident (playerId);
create index incident_incidentTypeId_index on incident (incidentTypeId);

