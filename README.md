## Running

Create a local mysql database. Scripts to create and drop the database can be 
found in the [/sql](./sql) directory. It also contains a script to populate test data. 

Copy `.env.sample` to a file named `.env` and configure as required.

Run the server in development mode. This mode uses ts-node, and nodemon for hot reloading 
without transpiling.

```bash

npm install
npm run dev

```

## Production database access

To access the production database, you'll need to install google's sql proxy.

```bash

curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy

```

Then connect to the database (you'll need to know the production database password).

```bash

cloud_sql_proxy -instances="world-sport-action:australia-southeast1:world-sport-action-dev"=tcp:3307
mysql --host 127.0.0.1 --port 3307 --user root --password

```

## Deploying to AWS
1) connect to server aws by ssh
2) execute `cd wsa-api/` go to project path
3) execute `git pull` fetch changes
4) execute `sudo sh stop_nohup.sh` stop current instance
5) execute `npm run dev` check that all run correct
6) press `ctrl + c` stop started prev step
7) execute `sudo sh start_nohup.sh` start instance as deamon
8) press enter
9) quit from server

## My Netball 

```
https://uatadmin-netball.resultsvault.com
MYNB_USER: e38925
MYNB_PASSWORD: uat123
```

```
https://admin-netball.resultsvault.com

NSNA (competitionId = 2)
NSNALive123
ethan&ciara

MWNA (competitionId = 1)
MWNACooper
ethan&ciara
```

To upload scores, run something like the following query:

```
select mnbMatchId, team1Score, team2Score from `match` where startTime > '2019-04-12' and mnbMatchId != '111';
```

Then marshall the results using something with multi-cursors into a bunch of curl statements that look like this:

```
curl -X POST 'http://localhost:8080/matches/mynb?mnbUrl=https://admin-netball.resultsvault.com&mnbUser=MWNACooper&mnbPassword=ethan%26ciara' -H 'Content-Type: application/json' -d '{"mnbMatchId":"6004470","team1Score":26, "team2Score":18}'
```

For attendance, do the same: 

```
select distinct mnbMatchId, attendance1.playerIdsJson, attendance2.playerIdsJson from `match`, attendance as attendance1, attendance as attendance2, team as team1, team as team2 
where attendance1.matchId = `match`.id and attendance1.teamId = team1.id
and attendance2.matchId = `match`.id and attendance2.teamId = team2.id
and match.team1Id = team1.id               
and match.team2Id = team2.id
and startTime > '2019-04-12' and mnbMatchId != '111' ;
```

... And:

```
curl -X POST 'http://localhost:8080/attendances/mynb?mnbUrl=https://admin-netball.resultsvault.com&mnbUser=MWNACooper&mnbPassword=ethan%26ciara' -H 'Content-Type: application/json' -d '{"mnbMatchId":"6004591","team1MnbPlayerIds":[1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1074],"team2MnbPlayerIds":[538, 1006, 1008, 1009, 1010, 1011, 1013]}'
```
