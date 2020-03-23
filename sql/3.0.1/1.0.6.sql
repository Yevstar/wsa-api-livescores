create view team_player_activity as
select
    `match`.`id` AS `matchId`,
    `team`.`id` AS `teamId`,
    `player`.`id` AS `playerId`,
    `match`.`mnbMatchId` AS `mnbMatchId`,
    `match`.`startTime` AS `startTime`,
    `team`.`name` AS `name`,
    `player`.`mnbPlayerId` AS `mnbPlayerId`,
    `player`.`firstName` AS `firstName`,
    `player`.`lastName` AS `lastName`,
    `a`.`period` AS `period`,
    `a`.`createdAt` AS `activityTimestamp`,
    (case
        when (`player`.`teamId` = `a`.`teamId`) then 'Played'
        else 'Borrowed'
    end) AS `status`,
    (case
        when (`player`.`teamId` = `a`.`teamId`) then 1
        else 2
    end) AS `sortOrder`,
    `match`.`competitionId` AS `competitionId`,
    `p`.`name` AS `positionName`,
    `p`.`id` AS `positionId`
from
    gameTimeAttendance a
left join player on
    a.playerId = player.id
left join gamePosition p on
    a.positionId = p.id
left join team on
    a.teamId = team.id
left join `match` on
    a.matchId = `match`.id
where
    a.isPlaying = TRUE or a.isBorrowed = TRUE
union
select
    `m`.`id` AS `matchId`,
    `team1`.`id` AS `teamId`,
    `player`.`id` AS `playerId`,
    `m`.`mnbMatchId` AS `mnbMatchId`,
    `m`.`startTime` AS `startTime`,
    `team1`.`name` AS `name`,
    `player`.`mnbPlayerId` AS `mnbPlayerId`,
    `player`.`firstName` AS `firstName`,
    `player`.`lastName` AS `lastName`,
    0 AS `0`,
    NULL AS `NULL`,
    'Did not play' AS `status`,
    3 AS `sortOrder`,
    `m`.`competitionId` AS `competitionId`,
    '-' AS `positionName`,
    0 AS `positionId`
from
    ((`match` `m`
join `team` `team1`)
join `player`)
where
    ((((`m`.`team1Id` = `team1`.`id`)
    and (`player`.`teamId` = `team1`.`id`))
    or ((`m`.`team2Id` = `team1`.`id`)
    and (`player`.`teamId` = `team1`.`id`)))
    and (not(`player`.`id` in (
    select
        `a`.`playerId`
    from
        `gameTimeAttendance` `a`
    where
        (`a`.`matchId` = `m`.`id`))))) or a.isBorrowed = TRUE