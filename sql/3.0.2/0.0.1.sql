alter table competition add bannerLink varchar(255) DEFAULT NULL;


CREATE TABLE `news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(2048) DEFAULT NULL,
  `newsImage` varchar(1024) DEFAULT NULL,
  `newsVideo` varchar(1024) DEFAULT NULL,
  `deleteNewsImage` varchar(1024) DEFAULT NULL,
  `deleteNewsVideo` varchar(1024) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL,
  `isNotification` tinyint(1) NOT NULL,
  `body` text,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `entityId` int(11) NOT NULL,
  `entityTypeId` int(11) NOT NULL,
  `author` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ;

alter table competition add recordGoalAttempts tinyint(1) DEFAULT 0 NULL;
