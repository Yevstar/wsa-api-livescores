import {Service} from "typedi";

import {paginationData, stringTONumber, isNotNullAndUndefined } from "../utils/Utils";
import BaseService from "./BaseService";
import {Player} from "../models/Player";
import {User} from "../models/User";
import {PlayerMinuteTracking} from "../models/PlayerMinuteTracking";
import {RequestFilter} from "../models/RequestFilter";
import {Competition} from '../models/Competition';
import {LinkedCompetitionOrganisation} from '../models/LinkedCompetitionOrganisation';

@Service()
export default class PlayerService extends BaseService<Player> {

    modelName(): string {
        return Player.name;
    }

    public async findByParam(
        name: string,
        competition: Competition,
        linkedCompetitionOrganisation: LinkedCompetitionOrganisation,
        teamId: number,
        playUpFromAge: number,
        playUpFromGrade: string,
        offset: number,
        limit: number,
        search: string,
        includeLinkedCompetition: boolean,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Player, 'player')
            .innerJoinAndSelect("player.team", "team")
            .innerJoinAndSelect("team.division", "division")
            .innerJoinAndSelect("player.competition", "competition")
            .leftJoinAndSelect("player.user", "user")
            .leftJoin("team.linkedCompetitionOrganisation", "linkedCompetitionOrganisation")
            .andWhere('player.deleted_at is null')
            .andWhere('team.deleted_at is null');

        if (name) {
            query.andWhere('(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :name)',
                { name: `%${name.toLowerCase()}%` });
        }

        if (competition) {
            if (includeLinkedCompetition && competition.linkedCompetitionId) {
                query.andWhere('(team.competitionId = :competitionId OR \n' +
                  'team.competitionId = :linkedCompetitionId)',
                  {competitionId: competition.id,
                    linkedCompetitionId: competition.linkedCompetitionId});
            } else {
                query.andWhere('team.competitionId = :id', {id: competition.id});
            }
        }

        if (linkedCompetitionOrganisation) {
            query.andWhere('team.competitionOrganisationId = :compOrgId', {compOrgId: linkedCompetitionOrganisation.id});
            if (includeLinkedCompetition) {
                query.andWhere('linkedCompetitionOrganisation.organisationId = :organisationId', {organisationId: linkedCompetitionOrganisation.organisationId});
            } else {
                query.andWhere('linkedCompetitionOrganisation.id = :id', {id: linkedCompetitionOrganisation.id});
            }
        }

        if (teamId) query.andWhere('team.id = :teamId', { teamId });

        if (playUpFromGrade && playUpFromAge) {
            let conditions = [];
            conditions.push(`(division.age < :age)`);
            conditions.push(`(division.age = :age and division.grade >= :grade)`);
            query.andWhere(`(${conditions.join(' or ')})`, { age: playUpFromAge, grade: playUpFromGrade });
        }

        if (search) {
            let conditions = [];
            conditions.push(`(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :playerName)`);
            conditions.push(`(LOWER(concat_ws("", division.divisionName, division.grade)) like :divisionName)`);
            conditions.push(`(LOWER(team.name) like :teamName)`);

            query.andWhere(`(${conditions.join(' or ')})`, {
                playerName: `%${search.toLowerCase()}%`,
                divisionName: `%${search.toLowerCase()}%`,
                teamName: `%${search.toLowerCase()}%`
            });
        }

        if (sortBy === 'division') {
            query.orderBy('division.name', sortOrder);
        } else if (sortBy === 'team') {
            query.orderBy('team.name', sortOrder);
        } else if (sortBy) {
            query.orderBy(`player.${sortBy}`, sortOrder);
        }

        if (offset !== null && offset !== undefined && limit !== null && limit !== undefined) {
            // return query.paginate(offset,limit).getMany();
            // switched to skip and limit function as with paginate(offset,limit) with offset 0, typeorm-plus gives the value
            // in negative as offset creating an error within query
            const matchCount = await query.getCount()
            const results = await query.skip(offset).take(limit).getMany();
            return { matchCount, results }
        } else {
          const matchCount = null;
          const results = await query.getMany();
          return { matchCount, results }
        }
    }

    public async loadPlayersPlayStat(teamId: number): Promise<PlayerMinuteTracking[]> {
        return this.entityManager.query('select pmt.playerId as playerId,\n' +
            '       JSON_OBJECT(\n' +
            '               \'id\', p.id,\n' +
            '               \'userId\', p.userId,\n' +
            '               \'user\', IF(p.userId != null, JSON_OBJECT(\n' +
            '               \'id\', u.id, \n' +
            '               \'firstName\', u.firstName, \n' +
            '               \'lastName\', u.lastName, \n' +
            '               \'mobileNumber\', u.mobileNumber, \n' +
            '               \'email\', u.email, \n' +
            '               \'dateOfBirth\', u.dateOfBirth, \n' +
            '               \'genderRefId\', u.genderRefId, \n' +
            '               \'statusRefId\', u.statusRefId, \n' +
            '               \'marketingOptIn\', u.marketingOptIn, \n' +
            '               \'photoUrl\', u.photoUrl, \n' +
            '               \'firebaseUID\', u.firebaseUID \n' +
            '               ), null), \n' +
            '               \'firstName\', p.firstName,\n' +
            '               \'lastName\', p.lastName,\n' +
            '               \'photoUrl\', p.photoUrl,\n' +
            '               \'competitionId\', p.competitionId,\n' +
            '               \'teamId\', p.teamId,\n' +
            '               \'dateOfBirth\', p.dateOfBirth,\n' +
            '               \'phoneNumber\', p.phoneNumber,\n' +
            '               \'mnbPlayerId\', p.mnbPlayerId,\n' +
            '               \'nameFilter\', p.nameFilter,\n' +
            '               \'positionId\', p.positionId,\n' +
            '               \'shirt\', p.shirt\n' +
            '           )             as player,\n' +
            '       sum(pmt.duration) as totalTime\n' +
            'from playerMinuteTracking pmt\n' +
            '     inner join player p on p.id = pmt.playerId\n' +
            '     left join wsa_users.user u on u.id = p.userId\n' +
            'where pmt.teamId = ?\n' +
            'group by pmt.playerId, player', [teamId]);
    }

    public async loadPlayersPlayStatByMatch(matchId: number, teamId: number): Promise<PlayerMinuteTracking[]> {
        return this.entityManager.query('select pmt.playerId as playerId,\n' +
            '       JSON_OBJECT(\n' +
            '               \'id\', p.id,\n' +
            '               \'userId\', p.userId,\n' +
            '               \'user\', IF(p.userId != null, JSON_OBJECT(\n' +
            '               \'id\', u.id, \n' +
            '               \'firstName\', u.firstName, \n' +
            '               \'lastName\', u.lastName, \n' +
            '               \'mobileNumber\', u.mobileNumber, \n' +
            '               \'email\', u.email, \n' +
            '               \'dateOfBirth\', u.dateOfBirth, \n' +
            '               \'genderRefId\', u.genderRefId, \n' +
            '               \'statusRefId\', u.statusRefId, \n' +
            '               \'marketingOptIn\', u.marketingOptIn, \n' +
            '               \'photoUrl\', u.photoUrl, \n' +
            '               \'firebaseUID\', u.firebaseUID \n' +
            '               ), null), \n' +
            '               \'firstName\', p.firstName,\n' +
            '               \'lastName\', p.lastName,\n' +
            '               \'photoUrl\', p.photoUrl,\n' +
            '               \'competitionId\', p.competitionId,\n' +
            '               \'teamId\', p.teamId,\n' +
            '               \'dateOfBirth\', p.dateOfBirth,\n' +
            '               \'phoneNumber\', p.phoneNumber,\n' +
            '               \'mnbPlayerId\', p.mnbPlayerId,\n' +
            '               \'nameFilter\', p.nameFilter,\n' +
            '               \'positionId\', p.positionId,\n' +
            '               \'shirt\', p.shirt\n' +
            '           )             as player,\n' +
            '       sum(pmt.duration) as totalTime\n' +
            'from playerMinuteTracking pmt\n' +
            '     inner join player p on p.id = pmt.playerId\n' +
            '     left join wsa_users.user u on u.id = p.userId\n' +
            'where pmt.matchId = ?\n' +
            'and pmt.teamId = ?\n' +
            'group by pmt.playerId, player', [matchId, teamId]);
    }

    public async loadGameTime(
        competitionId: number,
        aggregate: ("MINUTE" | "PERIOD" | "MATCH"),
        teamId: number,
        matchId: number,
        requestFilter: RequestFilter,
        sortBy: string = undefined,
        sortOrder:"ASC"|"DESC" = undefined
    ): Promise<any> {
        let limit;
        let offset;
        let search;
        if (isNotNullAndUndefined(requestFilter)) {
          if (isNotNullAndUndefined(requestFilter.paging)) {
              limit = requestFilter.paging.limit;
              offset = requestFilter.paging.offset;
          }
          if (isNotNullAndUndefined(requestFilter.search)) {
              search = requestFilter.search;
          }
        }
        let result = await this.entityManager.query("call wsa.usp_get_gametime(?,?,?,?,?,?,?,?,?)",
          [competitionId,
            aggregate,
            teamId,
            matchId,
            limit,
            offset,
            search,
            sortBy,
            sortOrder
          ]);

        if (limit && offset) {
            if (result != null) {
                let totalCount = (result[1] && result[1].find(x => x)) ? result[1].find(x => x).totalCount : 0;
                let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
                responseObject["stats"] = result[0];
                return responseObject;
            } else {
                return [];
            }
        } else {
            if (result != null) {
                return result[0];
            } else {
                return [];
            }
        }
    }

    public async loadPlayersBorrows(competitionId: number, teamId: number) {
        return this.entityManager.query(
            'select gta.playerId, count(distinct gta.matchId) as borrows, \n' +
            'SUM(pmt.duration) as totalTime \n' +
            'from player p, gameTimeAttendance gta, playerMinuteTracking pmt\n' +
            'where gta.isBorrowed = TRUE\n' +
            'and p.id = gta.playerId\n' +
            'and p.competitionId = ?\n' +
            'and p.teamId = ?\n' +
            'and pmt.playerId = gta.playerId\n' +
            'and pmt.matchId = gta.matchId\n' +
            'group by playerId', [competitionId, teamId]);
    }

    public async listTeamPlayerActivity(
        competitionId: number,
        competitionOrganisationId: number,
        requestFilter: RequestFilter,
        status: string,
        divisionId: string = undefined,
        roundIds: string = undefined,
        sortBy:string = undefined,
        sortOrder:"ASC"|"DESC" = undefined
    ): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_team_player_activity(?,?,?,?,?,?,?,?,?,?)",
        [
          competitionId,
          competitionOrganisationId,
          divisionId,
          roundIds,
          status,
          requestFilter.paging.offset,
          requestFilter.paging.limit,
          requestFilter.search,
          sortBy,
          sortOrder
        ]);

        if (isNotNullAndUndefined(requestFilter.paging.offset) && isNotNullAndUndefined(requestFilter.paging.limit)) {
            if (result != null) {
                let totalCount = (result[1] && result[1].find(x => x)) ? result[1].find(x => x).totalCount : 0;
                let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
                responseObject["stats"] = result[0];
                return responseObject;
            } else {
                return [];
            }
        } else {
            if (result != null) {
                return result[0];
            } else {
                return [];
            }
        }
    }

    public async loadBorrowsForPlayer(playerId: number) {
        return this.entityManager.query(
            'select t.name as teamName, \n' +
            '       t.logoUrl as teamLogoUrl, \n' +
            '       m.id as matchId, \n' +
            '       m.startTime as matchStartTime, \n' +
            '       m.matchDuration as matchDuration, \n' +
            '       SUM(pmt.duration) as borrowedTime \n' +
            'from wsa.gameTimeAttendance gta, \n' +
            '       wsa.playerMinuteTracking pmt, \n' +
            '       wsa.team t, \n' +
            '       wsa.match m \n' +
            'where gta.isBorrowed = TRUE \n' +
            '       and gta.playerId = ? \n' +
            '       and t.id = gta.teamId \n' +
            '       and pmt.playerId = gta.playerId \n' +
            '       and pmt.matchId = gta.matchId \n' +
            '       and pmt.teamId = gta.teamId \n' +
            '       and m.id = gta.matchId', [playerId]);
    }

    public async getBorrowedPlayersById(
        playerIds: number[]
    ): Promise<Player[]> {
      let query = this.entityManager.createQueryBuilder(Player, 'player')
          .innerJoinAndSelect("player.team", "team")
          .leftJoinAndSelect("player.user", "user")
          .where('player.id in (:playerIds)', {playerIds});

        return query.getMany();
    }

    public async findPendingInvites(email: string): Promise<Player[]> {
        let query = this.entityManager.createQueryBuilder(Player, 'player')
            .innerJoinAndSelect("player.team", "team")
            .leftJoinAndSelect("player.user", "user")
            .where('player.email = :email', {email})
            .andWhere('player.inviteStatus = :inviteStatus', {inviteStatus: 'INVITED'});

        return query.getMany();
    }

    public async updatePlayerUserDetails(prevUser: User, newUser: User) {
      return this.entityManager
          .createQueryBuilder(Player, 'player')
          .update()
          .set({userId: newUser.id, email: newUser.email})
          .where('userId = :userId', { userId: prevUser.id })
          .execute();
    }
}
