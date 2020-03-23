-- game_time_attendance
create table gameTimeAttendance
(
    id int auto_increment primary key,
    `key` varchar(255) null,
    matchId int null,
    teamId int null,
    playerId int null,
    period int null,
    positionId int null,
    createdAt datetime default CURRENT_TIMESTAMP not null,
    createdBy varchar(255) null,
    mnbPushed tinyint(1) null
);

create index matchId_teamId_idx on gameTimeAttendance (matchId, teamId);
create index playerId_teamId_idx on gameTimeAttendance (playerId, teamId);
create index playerId_matchId_idx on gameTimeAttendance (playerId, matchId);
ALTER TABLE gameTimeAttendance ADD CONSTRAINT gt_attendance_unique_constraint UNIQUE KEY (matchId, teamId, playerId);

create table gamePosition
(
    id int auto_increment primary key,
    name varchar(255) not null,
    isPlaying tinyint(1) not null
);

INSERT INTO `gamePosition` (`id`, `name`, `isPlaying`)
VALUES
	(1, 'Goal Keeper', 1),
	(2, 'Goal Defence', 1),
	(3, 'Wing Defence', 1),
	(4, 'Centre', 1),
	(5, 'Wing Attack', 1),
	(6, 'Goal Attack', 1),
	(7, 'Goal Shooter', 1),
	(8, 'Injured', 0),
	(9, 'Bench', 0);

-- user devices
create table userDevice
(
	id int auto_increment primary key,
	userId int null,
	deviceId varchar(255) null
);