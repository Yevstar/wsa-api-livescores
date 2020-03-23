ALTER TABLE wsa.banner MODIFY COLUMN `sequence` INT NULL;

ALTER TABLE wsa.playerMinuteTracking DROP COLUMN playedFullPeriod;
ALTER TABLE wsa.playerMinuteTracking ADD playedInPeriod BOOL NULL;
ALTER TABLE wsa.playerMinuteTracking ADD playedEndPeriod BOOL NULL;