import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchUmpire} from "../models/MatchUmpire";
import {Division} from "../models/Division";
import {Match} from "../models/Match";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {stringTONumber, paginationData, isNotNullAndUndefined, isArrayPopulated} from "../utils/Utils";

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

    public async findByRosterAndCompetition(organisationId: number, competitionId: number, matchId: number, divisionId: number, 
        venueId: number, roundIds: number[], requestFilter: RequestFilter, sortBy: string = undefined, sortOrder: "ASC" | "DESC" = undefined): Promise<any> {

        let limit = 50000;
        let offset = 0;
        if (requestFilter && isNotNullAndUndefined(requestFilter)
            && isNotNullAndUndefined(requestFilter.paging)
            && isNotNullAndUndefined(requestFilter.paging.limit)
            && isNotNullAndUndefined(requestFilter.paging.offset)) {
            limit = requestFilter.paging.limit;
            offset = requestFilter.paging.offset;
        }
        
        let roundString = roundIds ? roundIds.join(',') : '-1';
        let result = await this.entityManager.query("call wsa.usp_get_umpires(?,?,?,?,?,?,?,?, ?,?)",
            [organisationId, competitionId, matchId, divisionId, venueId, roundString, limit, offset, sortBy, sortOrder]);

        if (result != null) {
            let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
            let responseObject = paginationData(stringTONumber(totalCount), limit,offset);
            responseObject["results"] = result[0];
            let locationId = (result[2] && result[2].find(y=>y)) ? result[2].find(y=>y).locationId : 0;
            responseObject["locationId"] = locationId;

            return responseObject;
        } else {
            return [];
        }
    }

    public async deleteByParms(matchId: number, userId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder()
            .delete()
            .from(MatchUmpire)
            .andWhere("matchId = :matchId", {matchId})
            .andWhere("userId = :userId", {userId})
            .execute();
    }
}
