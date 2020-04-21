import {Service} from "typedi";
import BaseService from "./BaseService";
import {Brackets} from "typeorm-plus";
import {Round} from "../models/Round";

@Service()
export default class RoundService extends BaseService<Round> {

    modelName(): string {
        return Round.name;
    }

    public async findByParam(competitionId: number, divisionId: number, sequence: number,
                             teamIds: number[] = [], clubIds: number[], search: string): Promise<Round[]> {
        let query = this.entityManager.createQueryBuilder(Round, 'r')
            .leftJoinAndSelect('r.matches', 'match')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2')
            .leftJoinAndSelect('match.venueCourt', 'venueCourt')
            .leftJoinAndSelect('match.round', 'round')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .andWhere('match.deleted_at is null');

        if (competitionId) query.andWhere("r.competitionId = :competitionId", {competitionId});
        if (divisionId) query.andWhere("r.divisionId = :divisionId", {divisionId});
        if (sequence) query.andWhere("r.sequence = :sequence", {sequence});
        if (search!==null && search!==undefined && search!=='') query.andWhere("r.name = :search", { search: `%${search.toLowerCase()}%` });

        if ((teamIds && teamIds.length > 0) || (clubIds && clubIds.length > 0)) {
            query.andWhere(new Brackets(qb => {
                if (teamIds && teamIds.length > 0) {
                    qb.orWhere("(match.team1Id in (:teamIds) or match.team2Id in (:teamIds))", {teamIds});
                }
                if (clubIds && clubIds.length > 0) {
                    qb.orWhere("(team1.clubId in (:clubIds) or team2.clubId in (:clubIds))", {clubIds});
                }
            }))
        }
        return query.getMany()
    }

    public async findByName(competitionId: number, roundName: string, divisionId?: number): Promise<Round[]> {
        let query = this.entityManager.createQueryBuilder(Round, 'r')
            .andWhere("r.name = :roundName", {roundName})
            .andWhere("r.competitionId = :competitionId", {competitionId})
        if (divisionId) {
            query.andWhere("r.divisionId = :divisionId", {divisionId});
        }
        query.orderBy('r.divisionId');
        return query.getMany();
    }

    public async findUniqueNames(competitionId: number): Promise<Round[]> {
        return this.entityManager.query(
            'select `sequence`, min(name) from `round`\n' +
            'where competitionId = ?\n' +
            'group by `sequence`;'
            , [competitionId]);
    }
}
