alter table `user` add firebaseUID varchar(50) null;
create unique index user_firebaseUID_uindex on `user` (firebaseUID);
