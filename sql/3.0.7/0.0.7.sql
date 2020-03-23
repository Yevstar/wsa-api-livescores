create table incidentMedia
(
    id int auto_increment primary key,
    incidentId int not null,
    mediaUrl varchar(255) not null,
    mediaType varchar(20) not null,
    userId int not null,
    createdAt timestamp default current_timestamp not null
);

create index incidentMedia_incidentId_index on incidentMedia (incidentId);
create index incidentMedia_userId_index on incidentMedia (userId);
