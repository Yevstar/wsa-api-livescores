alter table matchScores drop primary key;
alter table matchScores add id int primary key auto_increment first;
alter table matchScores add `period` int null after matchId;
create index matchScores_matchId_period_index on matchScores (matchId, `period`);
create index matchScores_userId_matchId_index on matchScores (userId, matchId);

alter table `competition` add softBuzzerUrl varchar(255) null;
alter table `competition` add hardBuzzerUrl varchar(255) null;
update `competition` set softBuzzerUrl = 'https://firebasestorage.googleapis.com/v0/b/world-sport-action.appspot.com/o/buzzers%2Fnsna.m4a?alt=media&token=26fec7a7-d457-4407-8f79-e918bb695eb3' where softBuzzerUrl is null;
update `competition` set hardBuzzerUrl = 'https://firebasestorage.googleapis.com/v0/b/world-sport-action.appspot.com/o/buzzers%2Fstop.mp3?alt=media&token=dfa05136-5ba6-479f-b0a8-9cc130634fa8' where hardBuzzerUrl is null;

alter table `user` add photoUrl varchar(255) null;

DROP TABLE IF EXISTS `matchResultType`;
create table `matchResultType`
(
    id   int auto_increment primary key,
    code varchar(255) null
);

insert into `matchResultType` (`id`, `code`)
values (1, 'WON'),
       (2, 'LOST'),
       (3, 'DRAW'),
       (4, 'WON_FORFEIT'),
       (5, 'LOST_FORFEIT'),
       (6, 'DOUBLE_FORFEIT'),
       (7, 'BYE'),
       (8, 'ABANDONED_INCOMPLETE'),
       (9, 'ABANDONED_NOMATCH');


DROP TABLE IF EXISTS `competition_ladder_settings`;

CREATE TABLE `competition_ladder_settings`
(
    `id`            int(11) NOT NULL AUTO_INCREMENT,
    `competitionId` int(11) NOT NULL,
    `resultTypeId`  tinyint NOT NULL,
    `points`        smallint DEFAULT 0,
    `deleted_at`    datetime DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = latin1;

LOCK TABLES `competition_ladder_settings` WRITE;
/*!40000 ALTER TABLE `competition_ladder_settings`
    DISABLE KEYS */;

INSERT INTO `competition_ladder_settings` (`id`, `competitionId`, `resultTypeId`, `points`, `deleted_at`)
VALUES (1, 1, 1, 5, NULL),
       (2, 1, 2, 0, NULL),
       (3, 1, 3, 2, NULL),
       (4, 1, 4, 5, NULL),
       (5, 1, 5, 0, NULL),
       (6, 1, 6, 2, NULL),
       (7, 1, 7, 3, NULL),
       (8, 1, 8, 2, NULL),
       (9, 1, 9, 2, NULL),
       (10, 2, 1, 5, NULL),
       (11, 2, 2, 0, NULL),
       (12, 2, 3, 2, NULL),
       (13, 2, 4, 5, NULL),
       (14, 2, 5, 0, NULL),
       (15, 2, 6, 2, NULL),
       (16, 2, 7, 3, NULL),
       (17, 2, 8, 2, NULL),
       (18, 2, 9, 2, NULL),
       (19, 3, 1, 5, NULL),
       (20, 3, 2, 0, NULL),
       (21, 3, 3, 2, NULL),
       (22, 3, 4, 5, NULL),
       (23, 3, 5, 0, NULL),
       (24, 3, 6, 2, NULL),
       (25, 3, 7, 3, NULL),
       (26, 3, 8, 2, NULL),
       (27, 3, 9, 2, NULL),
       (28, 4, 1, 5, NULL),
       (29, 4, 2, 0, NULL),
       (30, 4, 3, 2, NULL),
       (31, 4, 4, 5, NULL),
       (32, 4, 5, 0, NULL),
       (33, 4, 6, 2, NULL),
       (34, 4, 7, 3, NULL),
       (35, 4, 8, 2, NULL),
       (36, 4, 9, 2, NULL),
       (37, 6, 1, 5, NULL),
       (38, 6, 2, 0, NULL),
       (39, 6, 3, 2, NULL),
       (40, 6, 4, 5, NULL),
       (41, 6, 5, 0, NULL),
       (42, 6, 6, 2, NULL),
       (43, 6, 7, 3, NULL),
       (44, 6, 8, 2, NULL),
       (45, 6, 9, 2, NULL),
       (46, 5, 1, 5, NULL),
       (47, 5, 2, 0, NULL),
       (48, 5, 3, 2, NULL),
       (49, 5, 4, 5, NULL),
       (50, 5, 5, 0, NULL),
       (51, 5, 6, 2, NULL),
       (52, 5, 7, 3, NULL),
       (53, 5, 8, 2, NULL),
       (54, 5, 9, 2, NULL);

/*!40000 ALTER TABLE `competition_ladder_settings`
    ENABLE KEYS */;
UNLOCK TABLES;


alter table `match` add team1ResultId tinyint null;
alter table `match` add team2ResultId tinyint null;


DROP TABLE IF EXISTS `competition_ladder_settings`;
create table `competition_ladder_settings`
(
    id   int auto_increment primary key,
    competitionId int null,
    resultTypeId tinyint null,
    points smallint null default 0
);

-- https://trello.com/c/FebXDGDk
alter table gameTimeAttendance alter column mnbPushed set default 0;
alter table gameTimeAttendance drop column `key`;
alter table gameTimeAttendance add verifiedBy varchar(255) null;
alter table gameTimeAttendance drop column createdBy;
alter table gameTimeAttendance add createdBy int not null after createdAt;

-- https://trello.com/c/0PfhTnqz
INSERT INTO `function` (`id`, `name`) VALUES (8, 'scorer_candidate');
INSERT INTO `functionRole` (`id`, `roleId`, `functionId`) VALUES (11, 3, 8);
INSERT INTO `functionRole` (`id`, `roleId`, `functionId`) VALUES (12, 5, 8);

-- https://trello.com/c/P0Dk0evd
rename table scorers to xx_scorers;

-- https://trello.com/c/lHag036e
create unique index entityType__name on entityType (name);
create unique index function__name on `function` (name);

create view linked_entities as
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           c.id                                                   as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'COMPETITION') as linkedEntityTypeId,
           c.name                                                 as linkedEntityName
    FROM competition c
    UNION
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           cl.id                                                  as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'CLUB')        as linkedEntityTypeId,
           cl.name                                                as linkedEntityName
    FROM competition c
             INNER JOIN club cl ON cl.competitionId = c.id
    UNION
    SELECT c.id                                                   as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'COMPETITION') as inputEntityTypeId,
           t.id                                                   as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'TEAM')        as linkedEntityTypeId,
           t.name                                                 as linkedEntityName
    FROM competition c
             INNER JOIN team t ON t.competitionId = c.id
    UNION
    SELECT cl.id                                           as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'CLUB') as inputEntityTypeId,
           cl.id                                           as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'CLUB') as linkedEntityTypeId,
           cl.name                                         as linkedEntityName
    FROM club cl
    UNION
    SELECT cl.id                                           as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'CLUB') as inputEntityTypeId,
           t.id                                            as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'TEAM') as linkedEntityTypeId,
           t.name                                          as linkedEntityName
    FROM club cl
             INNER JOIN team t ON cl.id = t.clubId
    UNION
    SELECT t.id                                            as inputEntityId,
           (SELECT id FROM entityType WHERE name = 'TEAM') as inputEntityTypeId,
           t.id                                            as linkedEntityId,
           (SELECT id FROM entityType WHERE name = 'TEAM') as linkedEntityTypeId,
           t.name                                          as linkedEntityName
    FROM team t;

-- https://trello.com/c/BqW3BJwd
alter table roster add constraint roster_unq_record unique (roleId, matchId, teamId, userId);

-- https://worldsportaction.atlassian.net/browse/NLA-114
alter table `match` add endTime datetime null after matchEnded;

-- https://worldsportaction.atlassian.net/browse/NLA-115
alter table `match` add matchStatus varchar(20) null after matchEnded;

-- https://worldsportaction.atlassian.net/browse/NLA-138
create index team_divisionId_index on team (divisionId);
create index team_logoUrl_index on team (logoUrl);
create index team_name_index on team (name);

create index competition_ladder_settings_competitionId_index on competition_ladder_settings (competitionId);
create index competition_ladder_settings_resultTypeId_index	on competition_ladder_settings (resultTypeId);

create index match_team1ResultId_index	on `match` (team1ResultId);
create index match_team2ResultId_index	on `match` (team2ResultId);

create view team_ladder as
select team.logoUrl as logoUrl
     , team.`name` as name
     , team.id as id
     , divisionId
     , competitionId
     , IFNULL(sum(games_played), 0)                                       as P
     , IFNULL(sum(won), 0)                                                as W
     , IFNULL(sum(lost), 0)                                               as L
     , IFNULL(sum(draw), 0)                                               as D
     , IFNULL(sum(goals_for), 0)                                          as F
     , IFNULL(sum(goals_against), 0)                                      as A
     , IFNULL(sum(won) + sum(lost) + sum(draw), 0)                        as Pts
     , IFNULL(sum(goals_for) / sum(goals_against) / sum(games_played), 0) as SMR
from team
         left join (
    select team1id                                 as teamId
         , sum(IF(team1resultId = 1, c.points, 0)) As won
         , sum(IF(team1resultId = 2, c.points, 0)) As lost
         , sum(IF(team1resultId = 3, c.points, 0)) As draw
         , sum(team1score)                         As goals_for
         , sum(team2score)                         As goals_against
         , sum(1)                                  As games_played
    from `match` m,
         competition_ladder_settings c
    where m.team1resultId = c.resultTypeId
      and m.competitionId = c.`competitionId`
    group By team1id
    UNION
    select team2id                                 as teamId
         , sum(IF(team2resultId = 1, c.points, 0)) As won
         , sum(IF(team2resultId = 2, c.points, 0)) As lost
         , sum(IF(team2resultId = 3, c.points, 0)) As draw
         , sum(team1score)                         As goals_for
         , sum(team2score)                         As goals_against
         , sum(1)                                  As games_played
    from `match` m,
         competition_ladder_settings c
    where m.team2resultId = c.resultTypeId
      and m.competitionId = c.`competitionId`
    group By team2id
) b on b.teamId = team.id
group by team.`name`, team.Id, divisionId, competitionId;


