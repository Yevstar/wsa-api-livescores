-- https://worldsportaction.atlassian.net/browse/NLA-208
create table matchEvent
(
	id int auto_increment,
	matchId int not null,
	eventCategory varchar(32) not null,
	type varchar(32) not null,
	eventTimestamp timestamp default current_timestamp not null,
	period int not null,
	attribute1Key varchar(32) null,
	attribute1Value varchar(32) null,
	attribute2Key varchar(32) null,
	attribute2Value varchar(32) null,
	userId int null,
    source varchar(11) null,
	constraint matchEvent_pk
		primary key (id)
);
