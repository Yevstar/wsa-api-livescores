import { Service } from "typedi";
import BaseService from "./BaseService";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { TeamLadder } from "../models/views/TeamLadder";
import {User} from "../models/User";
import {DeepLinkPlayer} from "../models/DeepLinkPlayer";
import {logger} from '../logger';
import { isArrayEmpty } from "../utils/Utils"
import nodeMailer from "nodemailer";
import {DeleteResult} from "typeorm-plus";

"use strict";

@Service()
export default class TeamService extends BaseService<Team> {

    modelName(): string {
        return Team.name;
    }

    public async findByManagedIds(managedIds: string[]): Promise<Team[]> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .innerJoinAndSelect('team.division', 'division')
            .andWhereInIds(managedIds)
            .getMany();
    }

    public async findByNameAndCompetition(name: string, competitionId: number): Promise<Team[]> {
        let query = this.entityManager.createQueryBuilder(Team, 'team')
            .innerJoinAndSelect('team.division', 'division')
            .innerJoinAndSelect('team.competition', 'competition');

        if (name) query = query.andWhere('LOWER(team.name) like :name', { name: `${name.toLowerCase()}%` });
        if (competitionId) query = query.andWhere('team.competitionId = :competitionId', { competitionId });
        return query.getMany();
    }

    public async findTeamWithUsers(
        teamId: number = undefined,
    ): Promise<any> {
        let response = {
            team: Team,
            players: [],
            managers: []
        }
        let result = await this.entityManager.query("call wsa.usp_get_team(?)",[teamId]);
        if (isArrayEmpty(result)) {
            if(result!= null && result[0]!= null) {
                response.team = result[0];
                response.players = result[1];
                response.managers = result[2];
                return response;
            }
        } else {
          return [];
        }
    }

    public async findTeamsWithUsers(
        competitionId: number,
        divisionId: number,
        search: string,
        offset: number,
        limit: number): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_teams(?,?,?,?,?)", [competitionId, search, limit, offset, divisionId]);
        if (isArrayEmpty(result)) {
            return { teamCount: result[1][0]['totalCount'], teams: result[0] }
        } else {
            return { teamCount: null, teams: [] }
        }
    }


    public async loadLadder(name: string, ids: number[], divisionIds: number[], competitionIds: number[]): Promise<TeamLadder[]> {
        let query = this.entityManager.createQueryBuilder(TeamLadder, 'tl');

        if (name != undefined) query.andWhere("LOWER(tl.name) like :name", { name: `${name.toLowerCase()}%` });
        if (ids) query.andWhere("tl.id in (:ids)", { ids });
        if (divisionIds) query.andWhere("tl.divisionId in (:divisionIds)", { divisionIds });
        if (competitionIds) query.andWhere("tl.competitionId in (:competitionIds)", { competitionIds });
        query.orderBy('tl.competitionId')
            .addOrderBy('tl.divisionId')
            .addOrderBy('tl.Pts', 'DESC')
            .addOrderBy('tl.SMR', 'DESC')
            .addOrderBy('tl.name');
        return query.getMany();
    }

    public async teamIdsByClubIds(clubIds: number[]): Promise<any[]> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .select('DISTINCT team.id', 'id')
            .andWhere('team.clubId in (:clubIds)', { clubIds })
            .getRawMany();
    }

    public async teamByClubId(clubId: number): Promise<Team[]> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .andWhere('team.clubId = :clubId', { clubId })
            .getMany();
    }

    public async playerListByTeamId(ids: number[]): Promise<Player[]> {
        let query = this.entityManager.createQueryBuilder(Player, 'player');
        if (ids) query.andWhere("player.teamId in (:ids)", { ids });
        query.andWhere("(player.email <> '' AND player.email IS NOT NULL)")
        return query.select(['player.id', 'player.firstName', 'player.lastName', 'player.email']).getMany();
    }

    public async getPlayerDataByPlayerIds(ids: number[]): Promise<Player[]> {
        let query = this.entityManager.createQueryBuilder(Player, 'player');
        if (ids) query.andWhere("player.id in (:ids)", { ids });
        query.andWhere("(player.email <> '' AND player.email IS NOT NULL)")
        return query.select(['player.id', 'player.firstName', 'player.lastName', 'player.email']).getMany();
    }

    public async summaryScoringStat(competitionId: number, teamId: number) {
        return this.entityManager.query(
            'select\n' +
            'SUM(IF(teamId = ?, goal, 0))         as own_goal,\n' +
            'SUM(IF(teamId = ?, miss, 0))         as own_miss,\n' +
            'SUM(IF(teamId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
            'SUM(goal)                            as avg_goal,\n' +
            'SUM(miss)                            as avg_miss,\n' +
            'SUM(penalty_miss)                    as avg_penalty_miss\n' +
            'from shootingStats\n' +
            'where competitionId = ? ;', [teamId, teamId, teamId, competitionId]
        );
    }

    public async scoringStatsByMatch(competitionId: number, teamId: number, matchId: number) {
        return this.entityManager.query(
            'select\n' +
            'SUM(IF(teamId = ? and matchId = ?, goal, 0))         as own_goal,\n' +
            'SUM(IF(teamId = ? and matchId = ?, miss, 0))         as own_miss,\n' +
            'SUM(IF(teamId = ? and matchId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
            'SUM(goal)                                            as avg_goal,\n' +
            'SUM(miss)                                            as avg_miss,\n' +
            'SUM(penalty_miss)                                    as avg_penalty_miss\n' +
            'from shootingStats\n' +
            'where competitionId = ? ;', [teamId, matchId, teamId, matchId, teamId, matchId, competitionId]
        );
    }

    public async scoringStatsByPlayer(competitionId: number, playerId: number, aggregate: ("ALL" | "MATCH")) {
        if (playerId) {
            return this.entityManager.query(
                'select\n' +
                'SUM(IF(playerId = ?, goal, 0))         as own_goal,\n' +
                'SUM(IF(playerId = ?, miss, 0))         as own_miss,\n' +
                'SUM(IF(playerId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
                'SUM(goal)                              as avg_goal,\n' +
                'SUM(miss)                              as avg_miss,\n' +
                'SUM(penalty_miss)                      as avg_penalty_miss\n' +
                'from shootingStats\n' +
                'where competitionId = ? ;', [playerId, playerId, playerId, competitionId]
            );
        } else {
            if (aggregate == "ALL") {
                return this.entityManager.query(
                    'select teamId, teamName, playerId, firstName, lastName, mnbPlayerId, gamePositionName, \n' +
                    'sum(goal) as goal, sum(miss) as miss, sum(penalty_miss) as penalty_miss,\n' +
                    'sum(goal) / (sum(goal) + if (sum(miss) is null, 0, sum(miss))) as goal_percent\n' +
                    'from shootingStats\n' +
                    'where competitionId = ? \n' +
                    'group by teamId, teamName, playerId, firstName, lastName, mnbPlayerId, gamePositionName;', [competitionId]
                );
            } else {
                return this.entityManager.query(
                    'select matchId, startTime, team1Name, team2Name, teamId, teamName, playerId, firstName, lastName, mnbPlayerId, gamePositionName, \n' +
                    'sum(goal) as goal, sum(miss) as miss, sum(penalty_miss) as penalty_miss,\n' +
                    'sum(goal) / (sum(goal) + if (sum(miss) is null, 0, sum(miss))) as goal_percent\n' +
                    'from shootingStats, `match` m\n' +
                    'where shootingStats.competitionId = ? and m.id = matchId\n' +
                    'group by matchId, team1Name, team2Name, teamId, teamName, playerId, firstName, lastName, mnbPlayerId, gamePositionName;', [competitionId]
                );
            }
        }
    }

    public async incidentsByTeam(competitionId: number, teamId: number) {
        return this.entityManager.query(
            'select 0 as matchId, competitionId, teamId, playerId, firstName, lastName, photoUrl,' +
            'sum(incident1) incident1Count, sum(incident2) incident2Count, sum(incident3) incident3Count\n' +
            'from incident_counts\n' +
            'where competitionId = ? and teamId = ?\n' +
            'group by competitionId, teamId, playerId, firstName, lastName, photoUrl', [competitionId, teamId]
        );
    }

    public async sendInviteMail(user: User, player: Player, isInviteToParents: boolean) {
        var deepLinkPlayer = new DeepLinkPlayer();
        deepLinkPlayer.id = player.id;
        deepLinkPlayer.firstName = player.firstName;
        deepLinkPlayer.lastName = player.lastName;
        deepLinkPlayer.isInviteToParents = isInviteToParents;

        /// Using base64 for getting player id encoded and sending in the url.
        deepLinkPlayer.deepLinkVia = "SIGN_UP";
        let signUpDetailsBuf = Buffer.from(JSON.stringify(deepLinkPlayer));
        deepLinkPlayer.deepLinkVia = "LOG_IN";
        let logInDetailsBuf = Buffer.from(JSON.stringify(deepLinkPlayer));

        let encodedSignUpDetails = signUpDetailsBuf.toString('base64');
        let encodedLogInDetails = logInDetailsBuf.toString('base64');

        /// While sending the URL the player value should be sent after doing
        /// encodeURIComponent otherwise we will not be getting the mail from
        /// the live Service, event though we get one when testest with localhost.
        let uriEncodedSignUpDetails = encodeURIComponent(encodedSignUpDetails);
        let uriEncodedLogInDetails = encodeURIComponent(encodedLogInDetails);

        let redirectURL = `https://www.worldsportaction.com/netballinvite/`;
        let signUpURL = `${redirectURL}${uriEncodedSignUpDetails}`;
        let loggedInURL = `${redirectURL}${uriEncodedLogInDetails}`;
        logger.info(`TeamService - sendInviteMail : signUpURL ${signUpURL},
            loggedInURL ${loggedInURL}`);
        let mailHtml = `${user.firstName} ${user.lastName} would like to invite
        you to use the Netball LiveScores App so that you can view team news,
        messages and events. Of course, this is in addition to viewing live
        scores, draws and ladders!
        <br><br> 1. If you don't have the App yet, download it from
        <a href=https://www.worldsportaction.com>worldsportaction.com</a>,
        go to Account and Sign up with your email.
        <br><br> 2. If you have the App and haven't signed up yet,
        <a href=${signUpURL}>click here</a>.
        <br><br> 3. If you have the App and have already signed up,
        <a href="${loggedInURL}">click here</a> to link your login.
        <br><br>It's that easy!`;

        /// Using nodemailer to send the mail via smtp gmail host
        /// on port 465 with secure true.
        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 465, // 465 for secure and 587 for non secure
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USERNAME, // generated ethereal user
                pass: process.env.MAIL_PASSWORD // generated ethereal password
            },
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
            }
        });
        const mailOptions = {
            from: {
                name: "World Sport Action",
                address: process.env.MAIL_USERNAME
            },
            to: player.email,
            replyTo: "donotreply@worldsportaction.com",
            subject: 'Invite Mail',
            html: mailHtml
        };

        await transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                logger.error(`TeamService - sendInviteMail : ${err}`);
                // Here i commented the below code as the caller is not handling the promise reject
                // return Promise.reject(err);
            } else {
              logger.info('TeamService - sendInviteMail : Mail sent successfully');
            }
            transporter.close();
            return Promise.resolve();
        });
    }

    public async softDelete(id: number, userId: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder(Team, 'team');
        query.andWhere("team.id = :id", { id });
        return query.softDelete().execute();
    }

    public async findTeams(
      teamId: number,
      clubId: number,
      competitionId: number,
      teamName: string
    ): Promise<Team[]> {
      let query = this.entityManager.createQueryBuilder(Team, 'team')
          .leftJoinAndSelect('team.division', 'division');
      if (teamId) {
          query.andWhere('team.id = :id', {id: teamId});
      }
      if (clubId) {
        query.andWhere('team.clubId = :id', {id: clubId});
      }
      if (competitionId) {
        query.andWhere('team.competitionId = :id', {id: competitionId});
      }
      if (teamName) {
          query.andWhere('LOWER(team.name) like :query', {query: `${teamName.toLowerCase()}%`});
      }

      query.andWhere('team.deleted_at is null');

      return query.getMany();
    }

    public async findByTeamIds(ids: number[]): Promise<Team[]> {

      if (isArrayEmpty(ids)) {
        let query = this.entityManager.createQueryBuilder(Team, 'team')
            .andWhere('team.id in (:ids)', {ids: ids})
            .andWhere('team.deleted_at is null');

        return query.getMany();
      } else {
        return [];
      }
    }
}
