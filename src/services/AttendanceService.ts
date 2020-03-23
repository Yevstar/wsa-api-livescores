import {Service} from "typedi";
import BaseService from "./BaseService";
import {Attendance} from "../models/Attendance";
import {TeamPlayerActivity} from "../models/views/TeamPlayerActivity";
import {DeleteResult} from "typeorm-plus";

@Service()
export default class AttendanceService extends BaseService<Attendance> {

    modelName(): string {
        return Attendance.name;
    }

    public async findByParam(matchId: number, teamId: number, latest: boolean, key: string): Promise<Attendance[]> {
        let query = this.entityManager.createQueryBuilder(Attendance, 'attendance');
        if (latest === true) query.orderBy('createdAt', 'DESC').limit(1);
        if (matchId) query.andWhere("attendance.matchId = :matchId", {matchId});
        if (key) query.andWhere("attendance.key = :key", {key});
        if (teamId) query.andWhere("attendance.teamId = :teamId", {teamId});
        return query.getMany()
    }

    public async findByMnb(): Promise<Attendance[]> {
        return this.entityManager.createQueryBuilder(Attendance, 'attendance')
            .innerJoinAndSelect('attendance.match', 'match')
            .innerJoin('match.competition', 'competition')
            .select(['attendance', 'match', 'competition.mnbUser', 'competition.mnbPassword',
                'competition.mnbUrl'])
            .andWhere('match.mnbMatchId IS NOT NULL AND match.mnbMatchId != \'111\' ' +
                'AND attendance.mnbPushed IS NULL AND DATE_ADD(match.startTime, INTERVAL 30 MINUTE) <= NOW()')
            .getMany();
    }

    public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(Attendance)
            .andWhere("matchId = :matchId", {matchId}).execute();
    }

    /* Team Player Activity */

    public async findActivityByParam(competitionId: number): Promise<TeamPlayerActivity[]> {
        let query = this.entityManager.createQueryBuilder(TeamPlayerActivity, 'activity')
            .andWhere('activity.competitionId = :competitionId', {competitionId})
            .orderBy('activity.firstName')
            .addOrderBy('activity.matchId');
        return query.getMany();
    }
}
