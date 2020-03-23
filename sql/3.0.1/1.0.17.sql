create table watchlist
(
    id int auto_increment,
    userId int null,
    deviceId varchar(255) null,
    entityId int not null,
    entityTypeId int not null,
    constraint watchlist_pk
        primary key (id)
);

create index watchlist_deviceId_index
    on watchlist (deviceId);

create index watchlist_userId_index
    on watchlist (userId);

alter table watchlist
    add constraint watchlist_pk
        unique (userId, deviceId, entityId, entityTypeId);
