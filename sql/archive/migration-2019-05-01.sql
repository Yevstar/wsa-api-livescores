alter table `match` add column mnbPushed BOOL;
alter table `competition` add column mnbUser VARCHAR(255);
alter table `competition` add column mnbPassword VARCHAR(255);
alter table `competition` add column mnbUrl VARCHAR(255);
alter table `attendance` add column mnbPushed BOOL;
alter table `player` add column mnbPlayerId VARCHAR(255);
