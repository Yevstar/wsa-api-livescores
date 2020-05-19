DROP TABLE IF EXISTS `wsa`.`matchUmpire`;

CREATE TABLE `wsa`.`matchUmpire` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
    `matchId` int(11) NOT NULL,
    `userId` int(11) DEFAULT NULL,
    `organisationId` int(11) DEFAULT NULL,
    `umpireName` varchar(255) DEFAULT NULL,
    `umpireType` varchar(255) DEFAULT NULL,
    `sequence` int(11) DEFAULT NULL,
    `createdBy` int(11) DEFAULT NULL,
		`verifiedBy` varchar(255) DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
	KEY `matchId_idx` (`matchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `wsa`.`roster` ADD COlUMN `locked` tinyint(1) DEFAULT 0 after status;
