--user encrypt passwords
update `user` set password = md5(password);
