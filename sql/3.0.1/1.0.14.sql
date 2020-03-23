DROP TABLE IF EXISTS `wsa`.`playerMinuteTracking`;
CREATE TABLE  `wsa`.`playerMinuteTracking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `matchId` int(11) DEFAULT NULL,
  `teamId` int(11) DEFAULT NULL,
  `playerId` int(11) DEFAULT NULL,
  `period` int(11) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `matchId_teamId_idx` (`matchId`,`teamId`),
  KEY `playerId_teamId_idx` (`playerId`,`teamId`),
  KEY `playerId_matchId_idx` (`playerId`,`matchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;