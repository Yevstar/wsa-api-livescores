alter table lineup add playing tinyint(1) DEFAULT 0 NULL;

alter table competition add incidentsEnabled tinyint(1) DEFAULT 0 NOT NULL;
