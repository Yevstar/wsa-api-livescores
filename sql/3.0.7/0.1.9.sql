alter table news ADD recipientRefId int null;
alter table news ADD `published_at` TIMESTAMP NULL AFTER `updated_at`;
alter table news alter column isActive set default 0;
alter table news alter column isNotification set default 0;
