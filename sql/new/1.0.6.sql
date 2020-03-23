create view team_player_activity as
select m.id as matchId, team.id as teamId, player.id as playerId, m.mnbMatchId, m.startTime, team.name, player.mnbPlayerId, player.firstName, player.lastName, period, createdAt as activityTimestamp,
	(case when (player.teamId = a.teamId) then "Played"
	else "Borrowed"
	end) as `status`, m.competitionId
from gameTimeAttendance a, player, `match` m, team
where a.playerId = player.id
and a.matchId = m.id
and a.teamId = team.id
union
select m.id as matchId, team1.id as teamId, player.id as playerId, m.mnbMatchId, m.startTime, team1.name, player.mnbPlayerId, player.firstName, player.lastName, 0, NULL, "Did not play" as `status`, m.competitionId
from `match` m, team team1, player
where m.team1id = team1.id
and player.teamId = team1.id
and player.id not in (select playerId from gameTimeAttendance a where a.matchId = m.id)
union
select m.id as matchId, team2.id as teamId, player.id as playerId, m.mnbMatchId, m.startTime, team2.name, player.mnbPlayerId, player.firstName, player.lastName, 0, NULL, "Did not play" as `status`, m.competitionId
from `match` m, team team2, player
where m.team2id = team2.id
and player.teamId = team2.id
and player.id not in (select playerId from gameTimeAttendance a where a.matchId = m.id);