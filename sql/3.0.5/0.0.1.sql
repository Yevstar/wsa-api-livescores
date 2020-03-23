CREATE TABLE `banner` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bannerUrl` varchar(255) DEFAULT NULL,
  `bannerLink` varchar(255) DEFAULT NULL,
  `showOnHome` tinyint(1) NOT NULL,
  `showOnDraws` tinyint(1) NOT NULL,
  `showOnLadder` tinyint(1) NOT NULL,
  `competitionId` int(11) DEFAULT NULL,
  `sequence` varchar(255) DEFAULT NULL,
  `bannerDeletUrl` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`)
);