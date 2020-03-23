-- https://worldsportaction.atlassian.net/browse/NLA-201
DROP EVENT IF EXISTS MatchStatusEvent;
CREATE EVENT MatchStatusEvent
    ON SCHEDULE every 1 minute
    COMMENT 'Automatically set match status'
    DO
    UPDATE `match` m INNER JOIN competition c ON c.id = m.competitionId
    SET matchStatus = IF(m.matchStatus = 'PAUSED', 'PAUSED',
                         IF(m.startTime <= NOW() and m.endTime is not null, 'ENDED',
                            IF(m.startTime <= NOW() and m.endTime is null and m.matchStatus is null or
                               m.matchStatus not in ('PAUSED', 'ENDED'), 'STARTED', null)
                             ))
    WHERE c.timerType != 'PER_MATCH';
