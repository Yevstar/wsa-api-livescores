alter table incidentType add column `sequence` int;

update incidentType set `sequence` = 1 where id = 1;
update incidentType set `sequence` = 2 where id = 2;
update incidentType set `sequence` = 3 where id = 3;

update incidentType set `sequence` = 1 where id = 5;
update incidentType set `sequence` = 2 where id = 6;
update incidentType set `sequence` = 3 where id = 7;


create view incident_counts as
select matchId, i.competitionId, i.teamId, p.id, p.firstName, p.lastName, p.photoUrl,
 sum(IF(t.`sequence` = 1, 1, 0)) As incident1,
 sum(IF(t.`sequence` = 2, 1, 0)) As incident2,
 sum(IF(t.`sequence` = 3, 1, 0)) As incident3
FROM wsa.incident i, wsa.incidentType t, incidentPlayer ip, player p
where i.incidentTypeId = t.id
and ip.incidentId = i.id
and p.id = ip.playerId
group by matchId, i.competitionId, i.teamId, p.id, p.firstName, p.lastName, p.photoUrl;