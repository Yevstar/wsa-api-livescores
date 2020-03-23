DROP TRIGGER IF EXISTS `matchEvent_AFTER_INSERT`;

DELIMITER $$
CREATE DEFINER = CURRENT_USER TRIGGER `matchEvent_AFTER_INSERT` AFTER INSERT ON `matchEvent` FOR EACH ROW
BEGIN
	IF NEW.eventCategory='timer' and NEW.type='periodEnd' THEN
		insert into playerMinuteTracking(matchId,teamId,playerId,period,duration)
		select
			NEW.matchId,
			g.teamId as teamId,
			g.playerId as playerId,
			m.period as period,
			sum(timestampdiff(second,if(g.createdAt>m.startInterval,g.createdAt,m.startInterval),if(g2.createdAt<m.endInterval and g2.createdAt is not null,g2.createdAt,m.endInterval))) as "duration (second)"
		from
			gameTimeAttendance g
			left join
				gameTimeAttendance g2
			on
				g2.matchId=g.matchId
				and g2.teamId=g.teamId
				and g2.playerId=g.playerId
				and g2.createdAt>g.createdAt
				and (g2.isPlaying=0
					or (g2.isPlaying=1 and not exists
					(select
						id
					from
						gameTimeAttendance g3
					where
						g3.matchId=g2.matchId
						and g3.teamId=g2.teamId
						and g3.playerId=g2.playerId
						and (g3.createdAt>=g2.createdAt or (g3.createdAt<g2.createdAt and g3.createdAt>g.createdAt))
						and g3.isPlaying=0)))
			inner join
				(select
					t.matchId as matchId,
					t.period as period,
					t.eventTimestamp as startInterval,
					min(t2.eventTimeStamp) as endInterval
				from
					matchEvent t
					inner join
						matchEvent t2
					on
						t2.matchId=t.matchId
						and t2.period=t.period
				where
					t.eventCategory='timer'
					and (t.type='periodStart' or (t.type='resume' and (t.Attribute1Key<>'isBreak' or t.Attribute1Value<>'true')))
					and t2.eventCategory='timer'
					and (t2.type='periodEnd' or (t2.type='pause' and (t2.Attribute1Key<>'isBreak' or t2.Attribute1Value<>'true')))
					and t2.eventTimeStamp>=t.eventTimeStamp
				group by
					t.matchId,
					t.period,
					t.eventTimestamp) as m
			on
				m.matchId=g.matchId
				and ((g.createdAt<=m.startInterval and (g2.createdAt>m.startInterval or g2.createdAt is null))
					or (g.createdAt>m.startInterval and g.createdAt<m.endInterval))
		where
			g.matchId=NEW.matchId
			and g.isPlaying=1
			and m.period=NEW.period
			and not exists
				(select
					id
				from
					gameTimeAttendance g4
				where
					g4.matchId=g.matchId
					and g4.teamId=g.teamId
					and g4.playerId=g.playerId
					and g4.createdAt=g.createdAt
					and g4.isPlaying=0)
		group by
			g.teamId,
			g.playerId,
			m.period;
  END IF;
END$$
DELIMITER ;
