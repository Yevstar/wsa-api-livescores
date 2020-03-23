alter table matchUmpires modify umpire1FullName varchar(255) null;
alter table matchUmpires modify umpire2FullName varchar(255) null;
alter table matchUmpires add verifiedBy varchar(255) null;

-- https://worldsportaction.atlassian.net/browse/NLA-38
insert into division (`id`, `name`, `age`, `grade`) values (17, '11A', 11, 'A');
insert into division (`id`, `name`, `age`, `grade`) values (18, '11B', 11, 'B');
insert into division (`id`, `name`, `age`, `grade`) values (19, '11C', 11, 'C');
insert into division (`id`, `name`, `age`, `grade`) values (20, '11D', 11, 'D');
insert into division (`id`, `name`, `age`, `grade`) values (21, '11E', 11, 'E');
insert into division (`id`, `name`, `age`, `grade`) values (22, '11F', 11, 'F');

alter table division add competitionId int null;
update division set competitionId = 1 where id >= 1 and id <= 16 or id in (31, 32);
update division set competitionId = 2 where id >= 17 and id <= 22;
update division set competitionId = 3 where id >= 33 and id <= 37;
update division set competitionId = 4 where id >=38 and id <= 40;
update division set competitionId = 6 where id >= 41 and id <= 44;
alter table division modify competitionId int not null;

create table `round` (
	`id` int not null auto_increment,
	`name` varchar(255) not null,
	`sequence` int not null,
	`competitionId` int not null,
	`divisionId` int not null,
	constraint round_pk primary key (id)
);

alter table `match` add roundId int null;

-- https://worldsportaction.atlassian.net/browse/NLA-91
create table `competitionVenue` (
	`id` int not null auto_increment,
	`competitionId` int not null,
	`venueId` int not null,
	constraint round_pk primary key (id)
);

insert into `competitionVenue` (`id`, `competitionId`, `venueId`) values (1, 1, 179)
insert into `competitionVenue` (`id`, `competitionId`, `venueId`) values (2, 2, 180)
insert into `competitionVenue` (`id`, `competitionId`, `venueId`) values (3, 3, 181)
insert into `competitionVenue` (`id`, `competitionId`, `venueId`) values (4, 6, 183)

alter table `venue` add `parentId` int null;

insert into venue (id, name, latitude, longitude, parentId) VALUES (179, 'Northern Suburbs Netball Association', -33.811633, 151.20341, null);
insert into venue (id, name, latitude, longitude, parentId) VALUES (180, 'John Fisher Netball Courts', -33.766867, 151.289535, null);
insert into venue (id, name, latitude, longitude, parentId) VALUES (181, 'Les Hughes Sporting Complex', -27.286567, 152.968861, null);
insert into venue (id, name, latitude, longitude, parentId) VALUES (182, 'Baulkham Hills Shire Netball Association', -33.682719, 150.934822, null);
insert into venue (id, name, latitude, longitude, parentId) VALUES (183, 'Meadowbank Park', -33.817394, 151.082077, null);

update venue set parentId =179 where id =1;
update venue set parentId =179 where id =2;
update venue set parentId =179 where id =3;
update venue set parentId =179 where id =4;
update venue set parentId =179 where id =5;
update venue set parentId =179 where id =6;
update venue set parentId =179 where id =7;
update venue set parentId =179 where id =8;
update venue set parentId =179 where id =9;
update venue set parentId =179 where id =10;
update venue set parentId =179 where id =11;
update venue set parentId =179 where id =12;
update venue set parentId =179 where id =13;
update venue set parentId =179 where id =14;
update venue set parentId =179 where id =15;
update venue set parentId =179 where id =16;
update venue set parentId =179 where id =17;
update venue set parentId =179 where id =18;
update venue set parentId =179 where id =19;
update venue set parentId =180 where id =21;
update venue set parentId =180 where id =22;
update venue set parentId =180 where id =23;
update venue set parentId =180 where id =24;
update venue set parentId =180 where id =25;
update venue set parentId =180 where id =26;
update venue set parentId =180 where id =27;
update venue set parentId =180 where id =28;
update venue set parentId =180 where id =29;
update venue set parentId =180 where id =30;
update venue set parentId =180 where id =31;
update venue set parentId =180 where id =32;
update venue set parentId =180 where id =33;
update venue set parentId =180 where id =34;
update venue set parentId =180 where id =35;
update venue set parentId =180 where id =36;
update venue set parentId =180 where id =37;
update venue set parentId =180 where id =38;
update venue set parentId =180 where id =39;
update venue set parentId =180 where id =40;
update venue set parentId =180 where id =41;
update venue set parentId =180 where id =42;
update venue set parentId =180 where id =43;
update venue set parentId =180 where id =44;
update venue set parentId =180 where id =45;
update venue set parentId =180 where id =46;
update venue set parentId =180 where id =47;
update venue set parentId =180 where id =48;
update venue set parentId =180 where id =49;
update venue set parentId =180 where id =50;
update venue set parentId =180 where id =51;
update venue set parentId =180 where id =52;
update venue set parentId =180 where id =53;
update venue set parentId =180 where id =54;
update venue set parentId =180 where id =55;
update venue set parentId =180 where id =56;
update venue set parentId =180 where id =57;
update venue set parentId =180 where id =58;
update venue set parentId =180 where id =59;
update venue set parentId =180 where id =60;
update venue set parentId =180 where id =61;
update venue set parentId =180 where id =62;
update venue set parentId =180 where id =63;
update venue set parentId =180 where id =64;
update venue set parentId =180 where id =65;
update venue set parentId =180 where id =66;
update venue set parentId =180 where id =67;
update venue set parentId =180 where id =68;
update venue set parentId =181 where id =71;
update venue set parentId =181 where id =72;
update venue set parentId =181 where id =73;
update venue set parentId =181 where id =74;
update venue set parentId =181 where id =75;
update venue set parentId =181 where id =76;
update venue set parentId =181 where id =77;
update venue set parentId =181 where id =78;
update venue set parentId =181 where id =79;
update venue set parentId =181 where id =80;
update venue set parentId =181 where id =81;
update venue set parentId =181 where id =82;
update venue set parentId =181 where id =83;
update venue set parentId =181 where id =84;
update venue set parentId =181 where id =85;
update venue set parentId =181 where id =86;
update venue set parentId =181 where id =87;
update venue set parentId =181 where id =88;
update venue set parentId =181 where id =89;
update venue set parentId =181 where id =90;
update venue set parentId =182 where id =101;
update venue set parentId =182 where id =102;
update venue set parentId =182 where id =103;
update venue set parentId =182 where id =104;
update venue set parentId =182 where id =105;
update venue set parentId =182 where id =106;
update venue set parentId =182 where id =107;
update venue set parentId =182 where id =108;
update venue set parentId =182 where id =109;
update venue set parentId =182 where id =110;
update venue set parentId =182 where id =111;
update venue set parentId =182 where id =112;
update venue set parentId =182 where id =113;
update venue set parentId =182 where id =114;
update venue set parentId =182 where id =115;
update venue set parentId =182 where id =116;
update venue set parentId =182 where id =117;
update venue set parentId =182 where id =118;
update venue set parentId =182 where id =119;
update venue set parentId =182 where id =120;
update venue set parentId =182 where id =121;
update venue set parentId =182 where id =122;
update venue set parentId =182 where id =123;
update venue set parentId =182 where id =124;
update venue set parentId =182 where id =125;
update venue set parentId =182 where id =126;
update venue set parentId =182 where id =127;
update venue set parentId =182 where id =128;
update venue set parentId =182 where id =129;
update venue set parentId =182 where id =130;
update venue set parentId =182 where id =131;
update venue set parentId =182 where id =132;
update venue set parentId =182 where id =133;
update venue set parentId =182 where id =134;
update venue set parentId =182 where id =135;
update venue set parentId =182 where id =136;
update venue set parentId =182 where id =137;
update venue set parentId =182 where id =138;
update venue set parentId =182 where id =139;
update venue set parentId =183 where id =151;
update venue set parentId =183 where id =152;
update venue set parentId =183 where id =153;
update venue set parentId =183 where id =154;
update venue set parentId =183 where id =155;
update venue set parentId =183 where id =156;
update venue set parentId =183 where id =157;
update venue set parentId =183 where id =158;
update venue set parentId =183 where id =159;
update venue set parentId =183 where id =160;
update venue set parentId =183 where id =161;
update venue set parentId =183 where id =162;
update venue set parentId =183 where id =163;
update venue set parentId =183 where id =164;
update venue set parentId =183 where id =165;
update venue set parentId =183 where id =166;
update venue set parentId =183 where id =167;
update venue set parentId =183 where id =168;
update venue set parentId =183 where id =169;
update venue set parentId =183 where id =170;
update venue set parentId =183 where id =171;
update venue set parentId =183 where id =172;
update venue set parentId =183 where id =173;
update venue set parentId =183 where id =174;
update venue set parentId =183 where id =175;
update venue set parentId =183 where id =176;
update venue set parentId =183 where id =177;
update venue set parentId =183 where id =178;