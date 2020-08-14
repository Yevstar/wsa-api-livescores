import { Service } from "typedi";
import BaseService from "./BaseService";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { TeamLadder } from "../models/views/TeamLadder";
import {User} from "../models/User";
import {DeepLinkPlayer} from "../models/DeepLinkPlayer";
import {logger} from '../logger';
import { isArrayPopulated, isNotNullAndUndefined, paginationData } from "../utils/Utils"
import nodeMailer from "nodemailer";
import {DeleteResult} from "typeorm-plus";
import AppConstants from "../utils/AppConstants";

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

    public async findByNameAndCompetition(name: string, competitionId: number, divisionName?: string): Promise<Team[]> {
        let query = this.entityManager.createQueryBuilder(Team, 'team')
            .innerJoinAndSelect('team.division', 'division')
            .innerJoinAndSelect('team.competition', 'competition');

        if (name) query = query.andWhere('LOWER(team.name) like :name', { name: `${name.toLowerCase()}%` });
        if (competitionId) query = query.andWhere('team.competitionId = :competitionId', { competitionId });
        if (divisionName) query = query.andWhere('division.name = :divisionName', { divisionName });
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
        if (isArrayPopulated(result)) {
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
        includeBye: boolean,
        search: string,
        offset: number,
        limit: number): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_teams(?,?,?,?,?,?)", [competitionId, search, limit, offset, divisionId,
           includeBye === true ? 1 : 0]);
        if (isArrayPopulated(result)) {
            return { teamCount: result[1][0]['totalCount'], teams: result[0] }
        } else {
            return { teamCount: null, teams: [] }
        }
    }


    public async loadLadder(name: string, ids: number[], divisionIds: number[], competitionIds: number[]): Promise<any> {
        // let query = this.entityManager.createQueryBuilder(TeamLadder, 'tl');

        // if (name != undefined) query.andWhere("LOWER(tl.name) like :name", { name: `${name.toLowerCase()}%` });
        // if (ids) query.andWhere("tl.id in (:ids)", { ids });
        // if (divisionIds) query.andWhere("tl.divisionId in (:divisionIds)", { divisionIds });
        // if (competitionIds) query.andWhere("tl.competitionId in (:competitionIds)", { competitionIds });
        // query.orderBy('tl.competitionId')
        //     .addOrderBy('tl.divisionId')
        //     .addOrderBy('tl.Pts', 'DESC')
        //     .addOrderBy('tl.SMR', 'DESC')
        //     .addOrderBy('tl.name');
        // return query.getMany();


        try {
            let vTeamIds = null;
            let vCompetitionIds = null;
            let vDivisionIds = null;
            if(ids){
                vTeamIds = ids;
            }
            if(divisionIds){
                vDivisionIds = divisionIds;
            }
            if(competitionIds){
                vCompetitionIds = competitionIds;
            }

            let result = await this.entityManager.query("call wsa.usp_get_ladder(?,?,?,?,?)",
            [null, null, vCompetitionIds,vTeamIds,  vDivisionIds]);
            let response = []
            if(result!= null){
                if(isArrayPopulated(result[0])){
                    result[0].map((x) => {
                        x.adjustments = x.adjustments!= null ? JSON.parse(x.adjustments) : []
                    })
                    response = result[0];
                }
            }
            return response;
        } catch (error) {
            throw error;
        }
    }


    public async getLadderList(requestBody: any, competitionId: number, competitionIds) {
        try {
            let vTeamIds = null;
            let vDivisionIds = null;
            let vDivisionId = null;
            if(requestBody.teamIds){
                vTeamIds = requestBody.teamIds;
            }
            if(requestBody.divisionIds){
                vDivisionIds = requestBody.divisionIds;
            }
            if(requestBody.divisionId){
                vDivisionId = requestBody.divisionId;
            }

            let result = await this.entityManager.query("call wsa.usp_get_ladder(?,?,?,?,?)",
            [competitionId, vDivisionId, competitionIds,vTeamIds,  vDivisionIds]);
            let ladders = []
            if(result!= null){
                if(isArrayPopulated(result[0])){
                    result[0].map((x) => {
                        x.adjustments = x.adjustments!= null ? JSON.parse(x.adjustments) : []
                    })
                    ladders = result[0];
                }
            }
            return ladders
        } catch (error) {
            throw error;
        }

    }

    public async teamIdsByOrganisationIds(organisationIds: number[]): Promise<any[]> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .select('DISTINCT team.id', 'id')
            .andWhere('team.organisationId in (:organisationIds)', { organisationIds })
            .getRawMany();
    }

    public async teamByOrganisationId(organisationId: number): Promise<Team[]> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .andWhere('team.organisationId = :organisationId', { organisationId })
            .getMany();
    }

    public async playerListByTeamId(ids: number[]): Promise<Player[]> {
        let query = this.entityManager.createQueryBuilder(Player, 'player');
        query.innerJoinAndSelect('player.team', 'team');
        if (ids) query.andWhere("player.teamId in (:ids)", { ids });
        query.andWhere("(player.email <> '' AND player.email IS NOT NULL)")
        return query.getMany();
    }

    public async getPlayerDataByPlayerIds(ids: number[]): Promise<Player[]> {
        let query = this.entityManager.createQueryBuilder(Player, 'player');
        query.innerJoinAndSelect('player.team', 'team')
        if (ids) query.andWhere("player.id in (:ids)", { ids });
        query.andWhere("(player.email <> '' AND player.email IS NOT NULL)")
        return query.getMany();
    }

    public async summaryScoringStat(competitionId: number, teamId: number, divisionId: number, noOfTeams: number) {
        return this.entityManager.query(
            'select\n' +
            'SUM(IF(teamId = ?, goal, 0))         as own_goal,\n' +
            'SUM(IF(teamId = ?, miss, 0))         as own_miss,\n' +
            'SUM(IF(teamId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
            '((SUM(goal)/?) * 100)                as avg_goal,\n' +
            '((SUM(miss)/?) * 100)                as avg_miss,\n' +
            '((SUM(penalty_miss)/?) * 100)        as avg_penalty_miss\n' +
            'from shootingStats\n' +
            'where competitionId = ? AND divisionId = ?;',
            [teamId, teamId, teamId, noOfTeams, noOfTeams, noOfTeams, competitionId, divisionId]
        );
    }

    public async scoringStatsByMatch(competitionId: number, teamId: number, matchId: number, divisionId: number, noOfMatches: number) {
        return this.entityManager.query(
            'select\n' +
            'SUM(IF(teamId = ? and matchId = ?, goal, 0))         as own_goal,\n' +
            'SUM(IF(teamId = ? and matchId = ?, miss, 0))         as own_miss,\n' +
            'SUM(IF(teamId = ? and matchId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
            '((SUM(goal)/?) * 100)                                as avg_goal,\n' +
            '((SUM(miss)/?) * 100)                                as avg_miss,\n' +
            '((SUM(penalty_miss)/?) * 100)                        as avg_penalty_miss\n' +
            'from shootingStats\n' +
            'where competitionId = ? AND  divisionId = ?;',
            [teamId, matchId, teamId, matchId, teamId, matchId, noOfMatches, noOfMatches, noOfMatches, competitionId, divisionId]
        );
    }

    public async scoringStatsByPlayer(
        competitionId: number,
        playerId: number,
        aggregate: ("ALL" | "MATCH"),
        offset: number,
        limit: number,
        search: string,
        divisionId: number,
        noOfTeams: number
    ): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_scoring_stats_by_player(?,?,?,?,?,?,?,?)",
            [competitionId, playerId, aggregate, limit, offset, search, divisionId, noOfTeams]);

        if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
            return { count: result[1], finalData: result[0] }
        } else {
            return result[0];
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

    public async sendInviteMail(user: User, player: Player, isInviteToParents: boolean, isExistingUser: boolean) {
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
        let yourLogin = 'your login';
        if (isInviteToParents) {
            yourLogin = 'your login to ' + player.firstName;
        }
        let teamName = '';
        if (player.team && player.team.name) {
            teamName = '- ' + player.team.name;
        }
        logger.info(`TeamService - sendInviteMail : signUpURL ${signUpURL},
            loggedInURL ${loggedInURL}`);
        let mailHtml = `${user.firstName} ${user.lastName} would like to invite
        you to use the Netball LiveScores App so that you can view team news,
        messages and events. Of course, this is in addition to viewing live
        scores, draws and ladders!
        <br><br> 1. If you don't have the App yet, download it from the <a href='https://itunes.apple.com/au/app/netball-live-scores/id1456225408'>App Store</a> or
        <a href='https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU'>Google Play</a>.
        <br><br> `;
        if (isExistingUser) {
            mailHtml = mailHtml + `<br><br> 2. If you have already logged into to the app, continue to Step 3, otherwise log in to the app with your email address and password: <b>8kul0zoi</b>. You can change this once you log in if you like.`
        } else {
            mailHtml = mailHtml + `2. If you have the App and haven't signed up yet,
            <a href=${signUpURL}>click here</a>.`
        }
     
        mailHtml = mailHtml + `<br><br> 3. If you have the App and have already signed up,
        <a href="${loggedInURL}">click here</a> to link ${yourLogin}.
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
            subject: `Invite Mail ${teamName}`,
            html: mailHtml
        };
        if(process.env.NODE_ENV == AppConstants.development){
            mailOptions.html = ' To: '+mailOptions.to + '<br><br>'+ mailOptions.html 
            mailOptions.to = process.env.TEMP_DEV_EMAIL
        }
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
      organisationId: number,
      competitionId: number,
      teamName: string
    ): Promise<Team[]> {
      let query = this.entityManager.createQueryBuilder(Team, 'team')
          .leftJoinAndSelect('team.division', 'division');
      if (teamId) {
          query.andWhere('team.id = :id', {id: teamId});
      }
      if (organisationId) {
        query.andWhere('team.organisationId = :id', {id: organisationId});
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

      if (isArrayPopulated(ids)) {
        let query = this.entityManager.createQueryBuilder(Team, 'team')
            .andWhere('team.id in (:ids)', {ids: ids})
            .andWhere('team.deleted_at is null');

        return query.getMany();
      } else {
        return [];
      }
    }

    public async findNumberOfTeams(divisionId: number): Promise<number> {
        return this.entityManager.createQueryBuilder(Team, 'team')
            .innerJoin('team.division', 'division')
            .where('team.divisionId = :divisionId', {divisionId: divisionId})
            .andWhere('team.deleted_at is null')
            .andWhere('division.deleted_at is null')
            .getCount();
    }
}
