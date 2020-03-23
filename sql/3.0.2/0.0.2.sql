create table gameStat
(
    id int auto_increment primary key,
    name varchar(255) not null,
    code varchar(255) not null
);

INSERT INTO gameStat (name,code)
VALUES
  ('Goal','G'),
  ('Miss','M'),
  ('Penalty Miss','PM'),
  ('Subtract', 'S');

