create table lineup
(
    id int auto_increment primary key,
    matchId int not null,
    competitionId int not null,
    teamId int not null,
    playerId int not null,
    positionId int null,
    shirt varchar(255) null,
    xCoordinate int null,
    yCoordinate int null,
);

create index lineup_matchId_index on lineup (matchId);
create index lineup_competitionId_index on lineup (competitionId);
create index lineup_teamId_index on lineup (teamId);
create index lineup_playerId_index on lineup (playerId);
create index lineup_positionId_index on lineup (positionId);
create unique index lineup_matchId_teamId_playerId_uindex on lineup (matchId, teamId, playerId);

