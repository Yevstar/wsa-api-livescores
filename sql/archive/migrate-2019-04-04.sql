DROP TABLE IF EXISTS scorers;

CREATE TABLE scorers (
  id int NOT NULL AUTO_INCREMENT,
  userId int,
  teamId int,
  PRIMARY KEY (id),
  UNIQUE teamId_userId_idx (teamId, userId)
);

alter table user add column teamManagerIdsJson JSON;