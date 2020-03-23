INSERT INTO `wsa`.`gamePosition` (`id`, `name`, `isPlaying`) VALUES (10, 'Absent', 0);
INSERT INTO `wsa`.`gamePosition` (`id`, `name`, `isPlaying`) VALUES (11, 'Unknown', 0);

alter table gameTimeAttendance drop key gt_attendance_unique_constraint;
alter table gameTimeAttendance add isBorrowed bool default false not null after positionId;
alter table gameTimeAttendance add isPlaying bool default false not null after isBorrowed;
alter table gameTimeAttendance alter column createdAt drop default;
alter table gameTimeAttendance modify positionId int default 11 not null;

alter table gamePosition add column isVisible bool default true not null;
update gamePosition set isVisible = false where id > 9;
