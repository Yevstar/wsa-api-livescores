-- TODO: still need to populate rounds and matches
insert into `round` (`id`, `name`, `sequence`, `competitionId`, `divisionId`) values (1, 'Round 1', 1, 1, 1);

update `match` set roundId=1 where id =41;