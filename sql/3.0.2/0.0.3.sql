drop view playerStats;

create view playerStats as
select m.competitionId, e.id, m.id as matchId, mnbMatchId, m.team1id, t1.name as team1Name, m.team2id, t2.name as team2Name, s.code as statCode, s.name as statName, 
    (case when attribute1Key = 'team1' then t1.id else t2.id end) as teamId,
    (case when attribute1Key = 'team1' then t1.name else t2.name end) as teamName,
	g.name as gamePositionName, p.id as playerId, mnbPlayerId, p.firstName, p.lastName
from matchEvent e
left join `match` m  on m.id = e.matchId
left join gameStat s on code = e.`type`
left join gamePosition g on g.id = e.attribute1Value
left join player p on p.id = e.attribute2Value
left join team t1 on m.team1id = t1.id
left join team t2 on m.team2id = t2.id
where e.eventCategory = 'stat'
and e.`type` is not null;


drop view shootingStats;

create view shootingStats as
SELECT competitionId, teamId, teamName, playerId, mnbPlayerId, firstName, lastName, matchId, mnbMatchId, team1id, team1Name, team2id, team2Name, gamePositionName
    , SUM(CASE
    		WHEN statCode = 'G' THEN 1 
            WHEN statCode = 'S' THEN -1
    	  END) as goal
    , SUM(CASE WHEN statCode = 'M' THEN 1 END) as miss
    , SUM(CASE WHEN statCode = 'PM' THEN 1 END) as penalty_miss
    , SUM(CASE WHEN statCode not in ('G', 'M', 'PM') THEN 1 END) as other
from playerStats
where statCode is not null
GROUP BY competitionId, teamId, teamName, playerId, mnbPlayerId, firstName, lastName, matchId, mnbMatchId, team1id, team1Name, team2id, team2Name, gamePositionName;