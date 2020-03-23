alter table `match` add originalStartTime datetime DEFAULT NULL;
alter table `match` add pauseStartTime datetime DEFAULT NULL;
alter table `match` add totalPausedMs int(11) DEFAULT 0;
