create table application_version
(
	id int auto_increment,
	platform varchar(50) not null,
	minSupportVersion varchar(30) not null,
	maxSupportVersion varchar(30) not null,
	active bool default false null,
	updateMessage varchar(255) null,
	applicationUrl varchar(255) null,
	create_at timestamp default current_timestamp not null,
	update_at timestamp default current_timestamp on update current_timestamp not null,
	constraint application_version_pk
		primary key (id)
);
