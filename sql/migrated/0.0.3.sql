ALTER TABLE `match` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `mnbPushed`;
ALTER TABLE `match` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `matchScores` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `team2Score`;
ALTER TABLE `matchScores` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `matchUmpires` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `umpire2ClubId`;
ALTER TABLE `matchUmpires` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `player` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `mnbPlayerId`;
ALTER TABLE `player` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `scorers` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `teamId`;
ALTER TABLE `scorers` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `team` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `team` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `user` ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `teamManagerIdsJson`;
ALTER TABLE `user` ADD `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_at`;

CREATE TABLE `role` (
  `id` int(11) NOT NULL,
  `name` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', '2019-06-13 18:43:20', '2019-06-13 18:43:20'),
(2, 'Admin', '2019-06-13 18:44:42', '2019-06-13 18:44:42');

--
-- Table structure for table `entityType`
--

CREATE TABLE `entityType` (
  `id` int(11) NOT NULL,
  `name` varchar(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `entityType`
--

INSERT INTO `entityType` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'COMPETITION', '2019-06-13 18:39:36', '2019-06-13 18:39:36'),
(2, 'CLUB', '2019-06-13 18:39:36', '2019-06-13 18:39:36'),
(3, 'TEAM', '2019-06-13 18:39:36', '2019-06-13 18:39:36');

CREATE TABLE `userRoleEntity` (
  `id` int(11) NOT NULL,
  `roleId` int(11) NOT NULL,
  `entityId` int(11) DEFAULT NULL,
  `entityTypeId` int(11) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `entityType`
--
ALTER TABLE `entityType`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `userRoleEntity`
--
ALTER TABLE `userRoleEntity`
  ADD PRIMARY KEY (`id`);
  
ALTER TABLE `user` ADD `status` INT(11) NOT NULL DEFAULT '1' AFTER `dateOfBirth`;
ALTER TABLE `userRoleEntity` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `competition` ADD `deleted_at` TIMESTAMP NULL AFTER `mnbUrl`;
ALTER TABLE `user` ADD `deleted_at` TIMESTAMP NULL AFTER `updated_at`;
Alter table scorers ADD deleted_at TIMESTAMP NULL AFTER updated_at;
ALTER TABLE `player` ADD `deleted_at` TIMESTAMP NULL AFTER `updated_at`;
ALTER TABLE `match` ADD `deleted_at` TIMESTAMP NULL AFTER `updated_at`;
ALTER TABLE team ADD deleted_at TIMESTAMP NULL AFTER updated_at;

alter table `match` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `matchScores` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `matchUmpires` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `player` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `scorers` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `team` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `user` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `role` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `entityType` modify `updated_at` timestamp default current_timestamp on update current_timestamp;
alter table `userRoleEntity` modify `updated_at` timestamp default current_timestamp on update current_timestamp;