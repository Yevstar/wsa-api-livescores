import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchUmpire} from "../models/MatchUmpire";
import {Division} from "../models/Division";
import {DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";

@Service()
export default class MatchUmpireService extends BaseService<MatchUmpire> {

    modelName(): string {
        return MatchUmpire.name;
    }

    public async findByMatchIds(matchIds: number[]): Promise<MatchUmpire[]> {
        return this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire')
            .leftJoinAndSelect('matchUmpire.organisation', 'organisation')
            .leftJoinAndSelect('matchUmpire.user', 'user')
            .where('matchUmpire.matchId in (:matchIds)', {matchIds})
            .orderBy('matchUmpire.matchId')
            .addOrderBy('matchUmpire.sequence')
            .getMany();
    }

    public async findByCompetitionId(competitionid: number, requestFilter: RequestFilter): Promise<any> {
        let query = this.entityManager.createQueryBuilder(MatchUmpire, 'matchUmpire');
        query.leftJoinAndSelect('matchUmpire.organisation', 'organisation')
            .leftJoinAndSelect('matchUmpire.user', 'user')
            .leftJoinAndSelect('matchUmpire.match', 'match')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2')
            .where('match.competitionId = :competitionid', {competitionid})
            .orderBy('matchUmpire.matchId')
            .addOrderBy('matchUmpire.sequence')
            .getMany();

        const matchCount = await query.getCount();
        const result = await query.skip(requestFilter.paging.offset).take(requestFilter.paging.limit).getMany();
        return {matchCount,result}

    }

    public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(MatchUmpire)
            .andWhere("matchId = :matchId", {matchId}).execute();
    }
}
