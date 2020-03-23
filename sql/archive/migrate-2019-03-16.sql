alter table `match` add column mainBreakDuration INT;

update `match` set mainBreakDuration = 240;
update `division` set age = 13;
update `division` set grade = 'B';

