import {Service} from "typedi";
import BaseService from "./BaseService";
import {GameTimeAttendance} from "../models/GameTimeAttendance";
import {DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {isNotNullAndUndefined, paginationData, stringTONumber} from "../utils/Utils"

@Service()
export default class GameTimeAttendanceService extends BaseService<GameTimeAttendance> {

    modelName(): string {
        return GameTimeAttendance.name;
    }

    public async count(matchId: number): Promise<number> {
        return this.entityManager.createQueryBuilder(GameTimeAttendance, 'gta')
            .where('gta.matchId = :matchId', {matchId})
            .getCount()
    }

    public async findByParam(matchId: number, teamId: number, playerId: number, period: number, positionId: number,
                             latest: boolean): Promise<GameTimeAttendance[]> {
        let query = this.entityManager.createQueryBuilder(GameTimeAttendance, 'att')
            .innerJoinAndSelect('att.match', 'match')
            .innerJoinAndSelect('att.team', 'team')
            .innerJoinAndSelect('att.player', 'player')
            .leftJoinAndSelect('att.position', 'position');
        if (matchId) query.andWhere("att.matchId = :matchId", {matchId});
        if (teamId) query.andWhere("att.teamId = :teamId", {teamId});
        if (playerId) query.andWhere("att.playerId = :playerId", {playerId});
        if (period) query.andWhere("att.period = :period", {period});
        if (positionId) query.andWhere("att.positionId = :positionId", {positionId});
        if (latest === true) {
            query.andWhere("att.id = " + query.subQuery().select("att2.id")
                .from(GameTimeAttendance, "att2")
                .andWhere("att2.matchId = att.matchId")
                .andWhere("att2.teamId = att.teamId")
                .andWhere("att2.playerId = att.playerId")
                .orderBy('att2.createdAt', 'DESC').limit(1).getQuery());
        }
        return query.getMany()
    }

    public async findPlayerByParamAndLast(matchId: number, teamId: number, playerId: number,
                                          period: number = undefined,
                                          positionId: number = undefined): Promise<GameTimeAttendance> {
        let query = this.entityManager.createQueryBuilder(GameTimeAttendance, 'att')
        if (matchId) query.andWhere("att.matchId = :matchId", {matchId});
        if (teamId) query.andWhere("att.teamId = :teamId", {teamId});
        if (playerId) query.andWhere("att.playerId = :playerId", {playerId});
        if (period) query.andWhere("att.period = :period", {period});
        if (positionId) query.andWhere("att.positionId = :positionId", {positionId});
        return query.orderBy('att.createdAt', 'DESC').limit(1).getOne()
    }

    public async findByMnb(): Promise<GameTimeAttendance[]> {
        return this.entityManager.createQueryBuilder(GameTimeAttendance, 'att')
            .innerJoinAndSelect('att.match', 'match')
            .innerJoin('match.competition', 'competition')
            .select(['att', 'match', 'competition.mnbUser', 'competition.mnbPassword',
                'competition.mnbUrl'])
            .andWhere('match.mnbMatchId IS NOT NULL AND match.mnbMatchId != \'111\' ' +
                'AND att.mnbPushed IS NULL AND DATE_ADD(match.startTime, INTERVAL 30 MINUTE) <= NOW()')
            .getMany();
    }


    public async deleteByMatchAndTeam(matchId: number, teamId: number, period: number, allPeriods: boolean = false, playerId: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder().delete().from(GameTimeAttendance);
        query.andWhere("matchId = :matchId", {matchId});
        if (teamId) {
            query.andWhere("teamId = :teamId", {teamId});
        }
        if (!allPeriods) {
            if (period >= 0) {
                query.andWhere("period = :period", {period});
            } else {
                query.andWhere("period is null");
            }
        }
        if (playerId) {
            query.andWhere("playerId = :playerId", {playerId});
        }
        return query.execute();
    }

    public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(GameTimeAttendance)
            .andWhere("matchId = :matchId", {matchId}).execute();
    }

    public async batchUpdate(attendance: GameTimeAttendance[]) {
        return GameTimeAttendance.save(attendance);
    }

    public prepare(matchId: number, teamId: number, period: number,
                         attendance: GameTimeAttendance, userId: number) {
        attendance.id = null;
        attendance.matchId = matchId;
        attendance.teamId = teamId;
        attendance.period = period;
        attendance.createdBy = userId;
        attendance.createdAt = attendance.createdAt ? attendance.createdAt : new Date();
        return attendance;
    }

    public async getPlayerAttendanceCount(teamId: number, matchId: number): Promise<number> {
        return await this.entityManager.createQueryBuilder(GameTimeAttendance, 'gta')
                .andWhere("gta.teamId = :teamId", {teamId})
                .andWhere("gta.matchId = :matchId", {matchId})
                .getCount();
    }

    public async loadPositionTrackingStats(aggregate: ("MATCH" | "TOTAL"), reporting: ("PERIOD" | "MINUTE"), competitionId: number, teamId: number, search: string, requestFilter: RequestFilter): Promise<any> {
        let queryFields = `SELECT 
            json_object('id', pc.teamId, 'name', t.name) as team,
            json_object('id', pc.playerId, 'firstName', p.firstName, 'lastName', p.lastName, 'photoUrl', ifnull(u.photoUrl, p.photoUrl), 'userId', p.userId) as player,
            sum(m.matchDuration) as playDuration,
            IFNULL(SUM(pc.gs + 0), 0) AS gs,
            IFNULL(SUM(pc.ga), 0) AS ga,
            IFNULL(SUM(pc.wa), 0) AS wa,
            IFNULL(SUM(pc.c), 0) AS c,
            IFNULL(SUM(pc.wd), 0) AS wd,
            IFNULL(SUM(pc.gd), 0) AS gd,
            IFNULL(SUM(pc.gk), 0) AS gk,
            IFNULL(SUM(pc.i), 0) AS i,
            IFNULL(SUM(pc.play), 0) AS play,
            IFNULL(SUM(pc.bench), 0) AS bench,
            IFNULL(SUM(pc.noplay), 0) AS noplay`;
        if (aggregate === 'MATCH') {
            queryFields = queryFields + ", json_object('id', m.id) as `match`";
        }
        let query = '';
        if (reporting === 'PERIOD') {
            query = query + " FROM position_periods_crosstab pc "
        } else {
            query = query + " FROM position_minutes_crosstab pc "
        }
        query = query + 
            'left join player p on pc.playerId = p.id \n' +
            'left join wsa_users.`user` u on p.userId = u.id \n' +
            'left join `match` m on pc.matchId = m.id \n' +
            'left join team t on pc.teamId = t.id \n';
        query = query + 'where t.competitionId =' + competitionId;
        if (teamId) {
            query = query + ' and pc.teamId =' + teamId;
        }
        let countResult;
        if (search) {
            query = query + ' and lower(concat_ws(" ", p.firstName, p.lastName)) like ?';
            countResult = await this.entityManager.query('select count(*) as totalCount' + query, ['%' + search + '%']);
        } else {
            countResult = await this.entityManager.query('select count(*) as totalCount' + query);
        }

        query = query + ' group by pc.teamId, playerId';
        if (aggregate === 'MATCH') {
            query = query + ', matchId';
        }

        if (isNotNullAndUndefined(requestFilter) 
                && isNotNullAndUndefined(requestFilter.paging)
                && isNotNullAndUndefined(requestFilter.paging.limit) 
                && isNotNullAndUndefined(requestFilter.paging.offset)) {
            let result;
            query = query + ' LIMIT ' + requestFilter.paging.offset + ', ' + requestFilter.paging.limit;
            if (search) {
                result =  await this.entityManager.query(queryFields + query, ['%' + search + '%']);
            } else {
                result = await this.entityManager.query(queryFields + query);
            }
            let totalCount = countResult[0]['totalCount'];
            let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
            responseObject["results"] = result;
            return responseObject;
        } else {
            if (search) {
                return this.entityManager.query(queryFields + query, ['%' + search + '%']);
            } else {
                return this.entityManager.query(queryFields + query);
            }
        }


        
    }
}
