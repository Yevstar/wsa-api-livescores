drop table if exists wsa.matchPausedTime;

create table wsa.matchPausedTime
(
    id int(11) auto_increment primary key,
    matchId int(11) NOT NULL,
    period int(11) NOT NULL,
    isBreak tinyint(1) default 0,
    totalPausedMs int(11) DEFAULT 0,
    createdAt timestamp default current_timestamp not null
);

create index matchPausedTime_matchId_index on wsa.matchPausedTime (matchId);
