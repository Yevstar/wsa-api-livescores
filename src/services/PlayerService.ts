import {Service} from "typedi";
import BaseService from "./BaseService";
import {Player} from "../models/Player";
import {PlayerMinuteTracking} from "../models/PlayerMinuteTracking";
import {GameTimeAttendance} from "../models/GameTimeAttendance";
import {Lineup} from "../models/Lineup";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber, isNotNullAndUndefined } from "../utils/Utils";
import {Competition} from '../models/Competition';
import {Organisation} from '../models/Organisation';

@Service()
export default class PlayerService extends BaseService<Player> {

    modelName(): string {
        return Player.name;
    }

    public async findByParam(
        name: string,
        competition: Competition,
        organisation: Organisation,
        teamId: number,
        playUpFromAge: number,
        playUpFromGrade: string,
        offset: number,
        limit: number,
        search: string,
        includeLinkedCompetition: boolean
    ): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Player, 'player')
            .innerJoinAndSelect("player.team", "team")
            .innerJoinAndSelect("team.division", "division")
            .innerJoinAndSelect("player.competition", "competition")
            .leftJoinAndSelect("player.user", "user")
            .leftJoin("team.organisation", "organisation");

        if (name) {
            query.andWhere('(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :name)',
                { name: `%${name.toLowerCase()}%` });
        }

        if (search) {
            query.andWhere(`(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :playerName)
                    or (LOWER(concat_ws("", division.divisionName, division.grade)) like :divisionName)
                    or (LOWER(team.name) like :teamName)`, {
                playerName: `%${search.toLowerCase()}%`,
                divisionName: `%${search.toLowerCase()}%`,
                teamName: `%${search.toLowerCase()}%`
            });
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

        if (organisation) {
            if (includeLinkedCompetition) {
                query.andWhere('organisation.organisationId = :organisationId', {organisationId: organisation.organisationId});
            } else {
                query.andWhere('organisation.id = :organisationId', {organisationId: organisation.id});
            }
        }

        if (teamId) query.andWhere('team.id = :teamId', { teamId });

        if (playUpFromGrade && playUpFromAge) {
            let conditions = [];
            conditions.push(`(division.age < :age)`);
            conditions.push(`(division.age = :age and division.grade >= :grade)`);
            query.andWhere(`(${conditions.join(' or ')})`,
                { age: playUpFromAge, grade: playUpFromGrade });
        }
        if (offset !== null && offset !== undefined && limit !== null && limit !== undefined) {
            // return query.paginate(offset,limit).getMany();
            // switched to skip and limit function as with paginate(offset,limit) with offset 0, typeorm-plus gives the value
            // in negative as offset creating an error within query
            const matchCount = await query.getCount()
            const result = await query.skip(offset).take(limit).getMany();
            return { matchCount, result }
        } else {
            return query.getMany();
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

    public async loadGameTime(competitionId: number, aggregate: ("GAME" | "MATCH" | "PERIOD"), requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_gametime(?,?,?,?,?)",
            [competitionId, aggregate, requestFilter.paging.limit, requestFilter.paging.offset,requestFilter.search]);

            if (isNotNullAndUndefined(requestFilter.paging.limit) && isNotNullAndUndefined(requestFilter.paging.offset)) {
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

    public async listTeamPlayerActivity(competitionId: number, requestFilter: RequestFilter, status: string): Promise<any> {

        let result = await this.entityManager.query("call wsa.usp_get_team_player_activity(?,?,?,?,?)",
        [competitionId, status, requestFilter.paging.offset, requestFilter.paging.limit, requestFilter.search]);

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
}
