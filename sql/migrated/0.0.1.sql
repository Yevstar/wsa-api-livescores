-- Competition
alter table competition add column gameTimeTracking tinyInt(1);
alter table competition add column positionTracking tinyInt(1);
alter table competition add column uploadScores tinyInt(1);
alter table competition add column uploadAttendance tinyInt(1);
alter table competition add column scoringType varchar(255) null;
alter table competition add column attendanceRecordingType varchar(255) null;
alter table competition add column timerType varchar(255) null;
alter table competition add column logoUrl varchar(255);

-- Team
alter table team add column gameTimeTrackingOverride tinyInt(1);
alter table team add column positionTracking tinyInt(1);

-- Match
alter table `match` add column extraTimeDuration int(11);