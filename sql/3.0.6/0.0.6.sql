alter table player add positionId int null after teamId;
alter table player add shirt varchar(11) null after positionId;
create index player_positionId_index on player (positionId);
create index player_teamId_index on player (teamId);
