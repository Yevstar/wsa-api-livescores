CREATE DATABASE wsa;
USE wsa;

SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS club;
DROP TABLE IF EXISTS competition;
DROP TABLE IF EXISTS division;
DROP TABLE IF EXISTS `match`;
DROP TABLE IF EXISTS `matchScores`;
DROP TABLE IF EXISTS `matchUmpires`;
DROP TABLE IF EXISTS player;
DROP TABLE IF EXISTS scorers;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS venue;

SET FOREIGN_KEY_CHECKS=1;

create table attendance
(
	id int auto_increment
		primary key,
	`key` varchar(255) null,
	matchId int null,
	teamId int null,
	playerIdsJson json null,
	createdAt datetime null,
	createdBy varchar(255) null,
	mnbPushed tinyint(1) null
);

create index matchId_teamId_idx
	on attendance (matchId, teamId);

create table club
(
	id int auto_increment
		primary key,
	name varchar(255) null,
	competitionId int not null,
	logoUrl varchar(255) null
);

create table competition
(
	id int auto_increment
		primary key,
	name varchar(255) null,
	bannerUrl varchar(255) null,
	recordUmpire tinyint(1) default 0 null,
	mnbUser varchar(255) null,
	mnbPassword varchar(255) null,
	mnbUrl varchar(255) null,
    gameTimeTracking tinyint(1) default 0 null,
    positionTracking tinyint(1) default 0 null,
    uploadScores tinyint(1) default 0 null,
    uploadAttendance tinyint(1) default 0 null,
    logoUrl varchar(255) null
);

create table division
(
	id int auto_increment
		primary key,
	name varchar(255) null,
	age int null,
	grade varchar(4) null
);

create index name_idx
	on division (name);

create table `match`
(
	id int auto_increment
		primary key,
	team1Score int null,
	team2Score int null,
	startTime datetime null,
	team1Id int null,
	team2Id int null,
	competitionId int null,
	divisionId int null,
	venueId int null,
	type varchar(255) null,
	matchDuration int null,
	breakDuration int null,
	mnbMatchId int null,
	mainBreakDuration int null,
	mnbPushed tinyint(1) null
);

create index competitionId_idx
	on `match` (competitionId);

create table matchScores
(
	userId int not null,
	matchId int not null,
	team1Score int null,
	team2Score int null,
	primary key (userId, matchId)
);

create table matchUmpires
(
	id int auto_increment
		primary key,
	matchId int not null,
	umpire1FullName varchar(255) not null,
	umpire1ClubId int null,
	umpire2FullName varchar(255) not null,
	umpire2ClubId int null,
	constraint matchId
		unique (matchId)
);

create index matchId_idx
	on matchUmpires (matchId);

create table player
(
	id int auto_increment
		primary key,
	firstName varchar(255) null,
	lastName varchar(255) null,
	photoUrl varchar(255) null,
	competitionId int null,
	teamId int null,
	dateOfBirth date null,
	phoneNumber varchar(255) null,
	nameFilter varchar(255) null,
	mnbPlayerId int null
);

create index competitionId_idx
	on player (competitionId);

create table scorers
(
	id int auto_increment
		primary key,
	userId int null,
	teamId int null,
	constraint teamId_userId_idx
		unique (teamId, userId)
);

create table team
(
	id int auto_increment
		primary key,
	name varchar(255) null,
	logoUrl varchar(255) null,
	divisionId int null,
	competitionId int null,
	nameFilter varchar(255) null,
	clubId int null
);

create index competitionId_idx
	on team (competitionId);

create table user
(
	id int auto_increment
		primary key,
	firstName varchar(255) null,
	lastName varchar(255) null,
	mobileNumber varchar(255) null,
	email varchar(255) null,
	password varchar(255) null,
	dateOfBirth date null,
	gender varchar(255) null,
	type int null,
	club varchar(255) null,
	reset varchar(255) null,
	teamManagerIdsJson json null
);

create index email_idx
	on user (email);

create table venue
(
	id int auto_increment
		primary key,
	name varchar(255) null,
	latitude double null,
	longitude double null
);




