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

    public async findByRosterAndCompetition(organisationId: number, competitionId: number, matchId: number, divisionId: number, venueId: number, requestFilter: RequestFilter): Promise<any> {
        
        /*let recordUmpires = 'NONE';
        let query = this.entityManager.createQueryBuilder(Match, 'match')
        .select(['match.id', 'match.startTime'])
        .innerJoinAndSelect('match.competition', 'competition')
        .innerJoin('match.team1', 'team1')
        .addSelect(['team1.id', 'team1.name'])
        .innerJoin('match.team2', 'team2')
        .addSelect(['team2.id', 'team2.name'])
        .leftJoin('match.round', 'round')
        .addSelect(['round.id', 'round.name'])
        .innerJoinAndSelect('match.venueCourt', 'venueCourt')
        .innerJoinAndSelect('venueCourt.venue', 'venue')
        .leftJoinAndSelect('match.allUmpires', 'allUmpires')
        .leftJoinAndSelect('allUmpires.user', 'user')
        .leftJoinAndSelect('user.userRoleEntities', 'userRoleEntity')
        .leftJoinAndSelect('userRoleEntity.organisation', 'organisation')
        .andWhere('match.deleted_at is null')
        .andWhere('competition.deleted_at is null')
        .andWhere('userRoleEntity.entityTypeId is null or (userRoleEntity.entityTypeId = 2 and userRoleEntity.roleId = 15) ')
        .andWhere('competition.recordUmpireType != :recordUmpires', { recordUmpires: 'NONE' })
        ;

        if (competitionId) {
            query.andWhere('match.competitionId = :competitionId', {competitionId});
        }

        if (matchId) {
            query.andWhere('match.id = :matchId', {matchId});
        }

        if (divisionId) {
            query.andWhere('match.divisionId = :divisionId', {divisionId});
        }

        if (venueCourtId) {
            query.andWhere('venueCourt.id = :venueCourtId', {venueCourtId});
        }*/

        let limit = 50000; 
        let offset = 0;
        if (isNotNullAndUndefined(requestFilter) 
            && isNotNullAndUndefined(requestFilter.paging)
            && isNotNullAndUndefined(requestFilter.paging.limit) 
            && isNotNullAndUndefined(requestFilter.paging.offset)) {
            limit = requestFilter.paging.limit;
            offset = requestFilter.paging.offset;
        }
        let result = await this.entityManager.query("call wsa.usp_get_umpires(?,?,?,?,?,?,?)", 
            [organisationId, competitionId, matchId, divisionId, venueId, limit, offset]);

        if (result != null) {
            let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
            let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
            responseObject["results"] = result[0];
            return responseObject;
        } else {
            return [];
        }
    }
}
