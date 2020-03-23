alter table competition add centrePassEnabled tinyint(1) DEFAULT 0 NULL;

alter table `match` add centrePassStatus varchar(20) null;
