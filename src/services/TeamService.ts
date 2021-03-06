import { Service } from 'typedi';
import BaseService from './BaseService';
import { Team } from '../models/Team';
import { Player } from '../models/Player';
import { TeamLadder } from '../models/views/TeamLadder';
import { User } from '../models/User';
import { DeepLinkPlayer } from '../models/DeepLinkPlayer';
import { logger } from '../logger';
import {
  getParentEmail,
  isArrayPopulated,
  isNotNullAndUndefined,
  paginationData,
} from '../utils/Utils';
import nodeMailer from 'nodemailer';
import { DeleteResult } from 'typeorm-plus';
import AppConstants from '../utils/AppConstants';
import { CommunicationTrack } from '../models/CommunicationTrack';
import { LinkedCompetitionOrganisation } from '../models/LinkedCompetitionOrganisation';

('use strict');

@Service()
export default class TeamService extends BaseService<Team> {
  modelName(): string {
    return Team.name;
  }

  public async findByManagedIds(managedIds: string[]): Promise<Team[]> {
    return this.entityManager
      .createQueryBuilder(Team, 'team')
      .innerJoinAndSelect('team.division', 'division')
      .andWhereInIds(managedIds)
      .getMany();
  }

  public async findByNameAndCompetition(
    name: string,
    competitionId: number,
    competitionOrganisationId?: number,
    divisionName?: string,
    exactlyMatchesName: boolean = false,
  ): Promise<Team[]> {
    let query = this.entityManager
      .createQueryBuilder(Team, 'team')
      .innerJoinAndSelect('team.division', 'division', 'division.deleted_at is null')
      .innerJoinAndSelect('team.competition', 'competition', 'competition.deleted_at is null');

    if (name) {
      query = exactlyMatchesName
        ? query.andWhere('LOWER(team.name) like :name', { name: `${name.toLowerCase()}` })
        : query.andWhere('LOWER(team.name) like :name', { name: `${name.toLowerCase()}%` });
    }
    if (isNotNullAndUndefined(competitionId)) {
      query = query.andWhere('team.competitionId = :competitionId', { competitionId });
    }
    if (isNotNullAndUndefined(competitionOrganisationId) && competitionOrganisationId != 0) {
      query = query.andWhere('team.competitionOrganisationId = :competitionOrganisationId', {
        competitionOrganisationId,
      });
    }
    if (isNotNullAndUndefined(divisionName)) {
      query = query.andWhere('division.name = :divisionName', { divisionName });
    }
    return query.getMany();
  }

  public async findTeamWithUsers(teamId: number = undefined): Promise<any> {
    let response = {
      team: Team,
      players: [],
      managers: [],
    };
    let result = await this.entityManager.query('call wsa.usp_get_team(?)', [teamId]);
    if (isArrayPopulated(result)) {
      if (result != null && result[0] != null) {
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
    competitionOrganisationId: number,
    divisionId: number,
    includeBye: number,
    search: string,
    offset: number,
    limit: number,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ): Promise<any> {
    let result = await this.entityManager.query('call wsa.usp_get_teams(?,?,?,?,?,?,?,?,?)', [
      competitionId,
      competitionOrganisationId,
      search,
      limit,
      offset,
      divisionId,
      includeBye,
      sortBy,
      sortOrder,
    ]);
    if (isArrayPopulated(result)) {
      return { teamCount: result[1][0]['totalCount'], teams: result[0] };
    } else {
      return { teamCount: null, teams: [] };
    }
  }

  public async loadLadder(
    name: string,
    ids: number[],
    divisionIds: number[],
    competitionIds: number[],
  ): Promise<any> {
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
      if (ids) {
        vTeamIds = ids;
      }
      if (divisionIds) {
        vDivisionIds = divisionIds;
      }
      if (competitionIds) {
        vCompetitionIds = competitionIds;
      }

      let result = await this.entityManager.query('call wsa.usp_get_ladder(?,?,?,?,?)', [
        null,
        null,
        vCompetitionIds,
        vTeamIds,
        vDivisionIds,
      ]);

      let response = [];
      if (result != null) {
        if (isArrayPopulated(result[0])) {
          result[0].map(x => {
            x.adjustments = x.adjustments != null ? JSON.parse(x.adjustments) : [];
          });
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
      if (requestBody.teamIds) {
        vTeamIds = requestBody.teamIds;
      }
      if (requestBody.divisionIds) {
        vDivisionIds = requestBody.divisionIds;
      }
      if (requestBody.divisionId) {
        vDivisionId = requestBody.divisionId;
      }

      let result = await this.entityManager.query('call wsa.usp_get_ladder(?,?,?,?,?)', [
        competitionId,
        vDivisionId,
        competitionIds,
        vTeamIds,
        vDivisionIds,
      ]);
      let ladders = [];
      if (result != null) {
        if (isArrayPopulated(result[0])) {
          result[0].map(x => {
            x.adjustments = x.adjustments != null ? JSON.parse(x.adjustments) : [];
          });
          ladders = result[0];
        }
      }
      return ladders;
    } catch (error) {
      throw error;
    }
  }

  public async teamIdsByCompetitionOrganisationIds(
    competitionOrganisationIds: number[],
  ): Promise<any[]> {
    return this.entityManager
      .createQueryBuilder(Team, 'team')
      .select('DISTINCT team.id', 'id')
      .andWhere('team.competitionOrganisationId in (:competitionOrganisationIds)', {
        competitionOrganisationIds,
      })
      .getRawMany();
  }

  public async teamsByCompetitionOrganisationId(
    competitionOrganisationId: number,
  ): Promise<Team[]> {
    return this.entityManager
      .createQueryBuilder(Team, 'team')
      .andWhere('team.competitionOrganisationId = :competitionOrganisationId', {
        competitionOrganisationId,
      })
      .getMany();
  }

  public async playerListByTeamId(ids: number[]): Promise<Player[]> {
    let query = this.entityManager.createQueryBuilder(Player, 'player');
    query.innerJoinAndSelect('player.team', 'team');
    query.leftJoinAndSelect('player.user', 'user');
    if (ids) {
      query.andWhere('player.teamId in (:ids)', { ids });
    }
    query.andWhere("(player.email <> '' AND player.email IS NOT NULL)");
    return query.getMany();
  }

  public async getPlayerDataByPlayerIds(ids: number[]): Promise<Player[]> {
    let query = this.entityManager.createQueryBuilder(Player, 'player');
    query.innerJoinAndSelect('player.team', 'team');
    query.leftJoinAndSelect('player.user', 'user');
    if (ids) {
      query.andWhere('player.id in (:ids)', { ids });
    }
    query.andWhere("(player.email <> '' AND player.email IS NOT NULL)");
    return query.getMany();
  }

  public async summaryScoringStat(
    competitionId: number,
    teamId: number,
    divisionId: number,
    noOfTeams: number,
  ) {
    return this.entityManager.query(
      'select\n' +
        'SUM(IF(teamId = ?, goal, 0))         as own_goal,\n' +
        'SUM(IF(teamId = ?, miss, 0))         as own_miss,\n' +
        'SUM(IF(teamId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
        '(SUM(goal)/?)                        as avg_goal,\n' +
        '(SUM(miss)/?)                        as avg_miss,\n' +
        '(SUM(penalty_miss)/?)                as avg_penalty_miss\n' +
        'from shootingStats\n' +
        'where competitionId = ? AND divisionId = ?;',
      [teamId, teamId, teamId, noOfTeams, noOfTeams, noOfTeams, competitionId, divisionId],
    );
  }

  public async scoringStatsByMatch(
    competitionId: number,
    teamId: number,
    matchId: number,
    divisionId: number,
    noOfMatches: number,
  ) {
    return this.entityManager.query(
      'select\n' +
        'SUM(IF(teamId = ? and matchId = ?, goal, 0))         as own_goal,\n' +
        'SUM(IF(teamId = ? and matchId = ?, miss, 0))         as own_miss,\n' +
        'SUM(IF(teamId = ? and matchId = ?, penalty_miss, 0)) as own_penalty_miss,\n' +
        '(SUM(goal)/?)                                as avg_goal,\n' +
        '(SUM(miss)/?)                                as avg_miss,\n' +
        '(SUM(penalty_miss)/?)                        as avg_penalty_miss\n' +
        'from shootingStats\n' +
        'where competitionId = ? AND  divisionId = ?;',
      [
        teamId,
        matchId,
        teamId,
        matchId,
        teamId,
        matchId,
        noOfMatches,
        noOfMatches,
        noOfMatches,
        competitionId,
        divisionId,
      ],
    );
  }

  public async scoringStatsByPlayer(
    competitionId: number,
    competitionOrganisationId: number,
    playerId: number,
    aggregate: 'ALL' | 'MATCH',
    offset: number,
    limit: number,
    search: string,
    divisionId: number,
    noOfTeams: number,
    sortBy: string = undefined,
    sortOrder: 'ASC' | 'DESC' = undefined,
  ): Promise<any> {
    let result = await this.entityManager.query(
      'call wsa.usp_get_scoring_stats_by_player(?,?,?,?,?,?,?,?,?,?,?)',
      [
        competitionId,
        competitionOrganisationId,
        playerId,
        aggregate,
        limit,
        offset,
        search,
        divisionId,
        noOfTeams,
        sortBy,
        sortOrder,
      ],
    );

    if (isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
      return { count: result[1], finalData: result[0] };
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
        'group by competitionId, teamId, playerId, firstName, lastName, photoUrl',
      [competitionId, teamId],
    );
  }

  public async sendInviteMail(
    user: User,
    player: Player,
    isInviteToParents: boolean,
    isExistingUser: boolean,
  ) {
    var appName = 'NetballConnect';
    var googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.wsa.netball&hl=en_AU';
    var appStoreUrl = 'https://itunes.apple.com/au/app/netball-live-scores/id1456225408';

    var deepLinkPlayer = new DeepLinkPlayer();
    deepLinkPlayer.id = player.id;
    deepLinkPlayer.userId = player.userId;
    deepLinkPlayer.user = player.user;
    deepLinkPlayer.firstName = player.firstName;
    deepLinkPlayer.lastName = player.lastName;
    deepLinkPlayer.isInviteToParents = isInviteToParents;

    /// Using base64 for getting player id encoded and sending in the url.
    deepLinkPlayer.deepLinkVia = 'SIGN_UP';
    let signUpDetailsBuf = Buffer.from(JSON.stringify(deepLinkPlayer));
    deepLinkPlayer.deepLinkVia = 'LOG_IN';
    let logInDetailsBuf = Buffer.from(JSON.stringify(deepLinkPlayer));

    let encodedSignUpDetails = signUpDetailsBuf.toString('base64');
    let encodedLogInDetails = logInDetailsBuf.toString('base64');

    /// While sending the URL the player value should be sent after doing
    /// encodeURIComponent otherwise we will not be getting the mail from
    /// the live Service, event though we get one when test with localhost.
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
    logger.info(
      `TeamService - sendInviteMail : signUpURL ${signUpURL}, loggedInURL ${loggedInURL}`,
    );
    let mailHtml = `${user.firstName} ${user.lastName} would like to invite
        you to use the ${appName} App so that you can view team news,
        messages and events. Of course, this is in addition to viewing live
        scores, draws and ladders!
        <br><br> 1. If you don't have the App yet, download it from the
            <a href='${appStoreUrl}'>App Store</a> or
            <a href='${googlePlayUrl}'>Google Play</a>.
        <br><br> `;
    if (isExistingUser) {
      mailHtml =
        mailHtml +
        `<br><br> 2. If you have already logged into to the app, continue to Step 3, otherwise log in to the app with your email address and password: <b>8kul0zoi</b>. You can change this once you log in if you like.`;
    } else {
      mailHtml =
        mailHtml +
        `2. If you have the App and haven't signed up yet,
            <a href=${signUpURL}>click here</a>.`;
    }

    mailHtml =
      mailHtml +
      `<br><br> 3. If you have the App and have already signed up,
        <a href="${loggedInURL}">click here</a> to link ${yourLogin}.
        <br><br>It's that easy!`;

    /// Using nodemailer to send the mail via smtp gmail host
    /// on port 465 with secure true.
    const transporter = nodeMailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // 465 for secure and 587 for non secure
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USERNAME, // generated ethereal user
        pass: process.env.MAIL_PASSWORD, // generated ethereal password
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });
    const targetMail = player?.user?.isInActive == 1 ? getParentEmail(player.email) : player.email;
    const mailOptions = {
      from: {
        name: 'NetballConnect',
        address: 'mail@netballconnect.com',
      },
      to: targetMail,
      replyTo: 'donotreply@worldsportaction.com',
      subject: `Invite Mail ${teamName}`,
      html: mailHtml,
    };
    if (Number(process.env.SOURCE_MAIL) == 1) {
      mailOptions.html = ' To: ' + mailOptions.to + '<br><br>' + mailOptions.html;
      mailOptions.to = process.env.TEMP_DEV_EMAIL;
    }
    let cTrack = new CommunicationTrack();
    try {
      cTrack.id = 0;

      cTrack.communicationType = 10;
      // cTrack.contactNumber = player.phoneNumber
      cTrack.entityId = player.id;
      cTrack.deliveryChannelRefId = 1;
      cTrack.emailId = player.email;
      cTrack.userId = player.userId;
      cTrack.subject = mailOptions.subject;
      cTrack.content = mailOptions.html;
      cTrack.createdBy = user.id;

      await transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          logger.error(`TeamService - sendInviteMail : ${err}`);
          cTrack.statusRefId = 2;
          this.insertIntoCommunicationTrack(cTrack);
          // Here i commented the below code as the caller is not handling the promise reject
          // return Promise.reject(err);
        } else {
          logger.info('TeamService - sendInviteMail : Mail sent successfully');
          cTrack.statusRefId = 1;
          this.insertIntoCommunicationTrack(cTrack);
        }
        transporter.close();
        return Promise.resolve();
      });
    } catch (error) {}
  }

  public async softDelete(id: number, userId: number): Promise<DeleteResult> {
    let query = this.entityManager.createQueryBuilder(Team, 'team');
    query.andWhere('team.id = :id', { id });
    return query.softDelete().execute();
  }

  public async findTeams(
    teamId: number,
    organisationId: number,
    competitionOrganisationId: number,
    competitionId: number,
    teamName: string,
    divisionsIds: number[] = [],
  ): Promise<Team[]> {
    let query = this.entityManager
      .createQueryBuilder(Team, 'team')
      .leftJoinAndSelect('team.division', 'division');

    if (isNotNullAndUndefined(organisationId) && organisationId != 0) {
      query.innerJoin(
        LinkedCompetitionOrganisation,
        'lco',
        '(lco.competitionId = team.competitionId and lco.organisationId = :id)',
        { id: organisationId },
      );
      query.andWhere('team.competitionOrganisationId = lco.id');
    }
    if (isNotNullAndUndefined(teamId)) {
      query.andWhere('team.id = :id', { id: teamId });
    }
    if (isNotNullAndUndefined(competitionOrganisationId) && competitionOrganisationId != 0) {
      query.andWhere('team.competitionOrganisationId = :competitionOrganisationId', {
        competitionOrganisationId,
      });
    }
    if (isNotNullAndUndefined(competitionId)) {
      query.andWhere('team.competitionId = :competitionId', { competitionId });
    }
    if (isNotNullAndUndefined(teamName)) {
      query.andWhere('LOWER(team.name) like :query', { query: `${teamName.toLowerCase()}%` });
    }
    if (isNotNullAndUndefined(divisionsIds) && divisionsIds.length > 0) {
      query.andWhere('team.divisionId IN (:divisionsIds)', { divisionsIds });
    }

    query.andWhere('team.deleted_at is null');

    return await query.getMany();
  }

  public async findByTeamIds(
    ids: number[],
    fetchTeamCompetition: boolean = false,
  ): Promise<Team[]> {
    if (isArrayPopulated(ids)) {
      let query = this.entityManager.createQueryBuilder(Team, 'team');

      if (fetchTeamCompetition) {
        query.innerJoinAndSelect(
          'team.competition',
          'competition',
          'competition.deleted_at is null',
        );
      }

      query.andWhere('team.id in (:ids)', { ids: ids }).andWhere('team.deleted_at is null');

      return query.getMany();
    } else {
      return [];
    }
  }

  public async findNumberOfTeams(divisionId: number): Promise<number> {
    return this.entityManager
      .createQueryBuilder(Team, 'team')
      .innerJoin('team.division', 'division')
      .where('team.divisionId = :divisionId', { divisionId: divisionId })
      .andWhere('team.deleted_at is null')
      .andWhere('division.deleted_at is null')
      .getCount();
  }

  public async insertIntoCommunicationTrack(ctrack: CommunicationTrack) {
    await this.entityManager.query(
      `insert into wsa_common.communicationTrack(id, emailId,content,subject,contactNumber,userId,entityId,communicationType,statusRefId,deliveryChannelRefId,createdBy) values(?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ctrack.id,
        ctrack.emailId,
        ctrack.content,
        ctrack.subject,
        ctrack.contactNumber,
        ctrack.userId,
        ctrack.entityId,
        ctrack.communicationType,
        ctrack.statusRefId,
        ctrack.deliveryChannelRefId,
        ctrack.createdBy,
      ],
    );
  }
}
