
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS eventInvitee;
DROP TABLE IF EXISTS eventOccurrence;
DROP TABLE IF EXISTS eventOccurrenceInvitee;

create table event
(
	id int auto_increment primary key,
	name varchar(255) null,
	location varchar(255) null,
	type varchar(255) null,
	description varchar(255) null,
	allDay tinyint(1) default 0 null,
	startTime datetime,
	endTime datetime,
	frequency varchar(255) null,
	repeatNumber int null,
	created_by int null,
	created_at datetime,
	updated_at datetime,
	deleted_at datetime

);

create table eventInvitee
(
	id int auto_increment primary key,
	eventId int not null,
	entityId int not null,
	entityTypeId int not null
	
);

create table eventOccurrence
(
	id int auto_increment primary key,
	eventId int not null,
	startTime datetime,
	endTime datetime,
	allDay tinyint(1) default 0 null,
	created_by int null,
	created_at datetime,
	updated_at datetime,
	deleted_at datetime
);

create table eventOccurrenceInvitee
(
	id int auto_increment primary key,
	eventOccurrenceId int not null,
	entityId int not null,
	entityTypeId int not null
);

