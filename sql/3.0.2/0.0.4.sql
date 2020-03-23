alter table `match` add scorerStatus varchar(20) DEFAULT 'SCORER1' NOT NULL after mainBreakDuration;
update `match` set scorerStatus = 'SCORER1';

INSERT INTO team (name,logoUrl,divisionId,competitionId,nameFilter,clubId,gameTimeTrackingOverride,positionTracking,created_at,updated_at,deleted_at,delete_logo_link) 
VALUES
  ('Bye','',0,0,NULL,0,NULL,NULL,TIMESTAMP '2019-07-04 06:37:58.000',TIMESTAMP '2019-09-10 06:08:51.000',NULL,NULL);
