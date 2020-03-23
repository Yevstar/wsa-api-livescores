SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS division;
DROP TABLE IF EXISTS `match`;
DROP TABLE IF EXISTS player;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS venue;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS competition;

SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE competition (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255),
  PRIMARY KEY (id)
);

CREATE TABLE attendance (
  id int NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255),
  matchId int,
  teamId int,
  playerIdsJson JSON,
  createdAt DATETIME,
  createdBy VARCHAR(255),
  PRIMARY KEY (id),
  INDEX matchId_teamId_idx (matchId, teamId)
);

CREATE TABLE division (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255),
  age INT,
  grade VARCHAR(4),
  PRIMARY KEY (id),
  INDEX name_idx (name)
);

CREATE TABLE `match` (
  id int NOT NULL AUTO_INCREMENT,
  team1Score int,
  team2Score int,
  startTime DATETIME,
  team1Id int,
  team2Id int,
  competitionId int,
  divisionId int,
  venueId int,
  type varchar(255),
  matchDuration int,
  breakDuration int,
  mnbMatchId int,
  mainBreakDuration INT,
  PRIMARY KEY (id),
  INDEX competitionId_idx (competitionId)
);

CREATE TABLE player (
  id int NOT NULL AUTO_INCREMENT,
  firstName varchar(255),
  lastName varchar(255),
  photoUrl varchar(255),
  competitionId int,
  teamId int,
  dateOfBirth DATE,
  phoneNumber varchar(255),
  PRIMARY KEY (id),
  INDEX competitionId_idx (competitionId)
);

CREATE TABLE team (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255),
  logoUrl varchar(255),
  divisionId int,
  competitionId int,
  PRIMARY KEY (id),
  INDEX competitionId_idx (competitionId)
);

CREATE TABLE `user` (
  id int NOT NULL AUTO_INCREMENT,
  firstName varchar(255),
  lastName varchar(255),
  mobileNumber varchar(255),
  email varchar(255),
  password varchar(255),
  dateOfBirth DATE,
  gender varchar(255),
  type int,
  club varchar(255),
  reset varchar(255),
  PRIMARY KEY (id),
  INDEX email_idx (email)
);

CREATE TABLE venue (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255),
  latitude double,
  longitude double,
  PRIMARY KEY (id)
);


