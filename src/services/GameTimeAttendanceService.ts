import {Service} from "typedi";
import BaseService from "./BaseService";
import {GameTimeAttendance} from "../models/GameTimeAttendance";
import {DeleteResult} from "typeorm-plus";

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
}
