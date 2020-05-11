import {Service} from "typedi";
import BaseService from "./BaseService";
import {Player} from "../models/Player";
import {PlayerMinuteTracking} from "../models/PlayerMinuteTracking";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber, isNotNullAndUndefined } from "../utils/Utils";

@Service()
export default class PlayerService extends BaseService<Player> {

    modelName(): string {
        return Player.name;
    }

    public async findByParam(name: string, competitionId: number, clubId: number, teamId: number,
        playUpFromAge: number, playUpFromGrade: string, offset: number, limit: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Player, 'player')
            .innerJoinAndSelect("player.team", "team")
            .innerJoinAndSelect("team.division", "division")
            .innerJoinAndSelect("player.competition", "competition")
            .leftJoin("team.club", "club");

        if (name) {
            query.andWhere('(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :name)',
                { name: `%${name.toLowerCase()}%` });
        }

        if (competitionId) query.andWhere('team.competitionId = :competitionId', { competitionId });
        if (clubId) query.andWhere('club.id = :clubId', { clubId });
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
            'and pmt.teamId = ?\n' +
            'group by pmt.playerId, player', [teamId]);
    }

    public async loadPlayersPlayStatByMatch(matchId: number, teamId: number): Promise<PlayerMinuteTracking[]> {
        return this.entityManager.query('select pmt.playerId as playerId,\n' +
            '       JSON_OBJECT(\n' +
            '               \'id\', p.id,\n' +
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
            '         inner join player p on p.id = pmt.playerId\n' +
            'where pmt.matchId = ?\n' +
            'and pmt.teamId = ?\n' +
            'group by pmt.playerId, player', [matchId, teamId]);
    }

    public async loadGameTime(competitionId: number, aggregate: ("GAME" | "MATCH" | "PERIOD"), requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_gametime(?,?,?,?)",
            [competitionId, aggregate, requestFilter.paging.limit, requestFilter.paging.offset]);

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
        return this.entityManager.query('select playerId, count(distinct matchId) as borrows \n' +
            'from player p, gameTimeAttendance gta\n' +
            'where isBorrowed = TRUE\n' +
            'and p.id = gta.playerId\n' +
            'and p.competitionId = ?\n' +
            'and p.teamId = ?\n' +
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

}
