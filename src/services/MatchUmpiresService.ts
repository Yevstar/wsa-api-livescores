import {Service} from "typedi";
import BaseService from "./BaseService";
import {MatchUmpires} from "../models/MatchUmpires";
import {Division} from "../models/Division";
import {DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";

@Service()
export default class MatchUmpiresService extends BaseService<MatchUmpires> {

    modelName(): string {
        return MatchUmpires.name;
    }

    public async count(matchId: number): Promise<number> {
        return this.entityManager.createQueryBuilder(MatchUmpires, 'matchUmpires')
            .where('matchUmpires.matchId = :matchId', {matchId})
            .getCount();
    }

    public async findByMatchIds(matchIds: number[]): Promise<MatchUmpires[]> {
        return this.entityManager.createQueryBuilder(MatchUmpires, 'matchUmpires')
            .leftJoinAndSelect('matchUmpires.umpire1Club', 'club1')
            .leftJoinAndSelect('matchUmpires.umpire2Club', 'club2')
            .leftJoinAndSelect('matchUmpires.umpire1User', 'user1')
            .leftJoinAndSelect('matchUmpires.umpire2User', 'user2')
            .where('matchUmpires.matchId in (:matchIds)', {matchIds})
            .getMany();
    }

    public async findByCompetitionId(competitionid: number, requestFilter: RequestFilter): Promise<any> {
        let query = this.entityManager.createQueryBuilder(MatchUmpires, 'matchUmpires');
        query.leftJoinAndSelect('matchUmpires.umpire1Club', 'club1')
            .leftJoinAndSelect('matchUmpires.umpire2Club', 'club2')
            .leftJoinAndSelect('matchUmpires.umpire1User', 'user1')
            .leftJoinAndSelect('matchUmpires.umpire2User', 'user2')
            .leftJoinAndSelect('matchUmpires.match', 'match')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2')
            .where('match.competitionId = :competitionid', {competitionid});

            if (requestFilter.search && requestFilter.search!=='') {
                query.andWhere('(LOWER(matchUmpires.umpire1FullName) like :search) || (LOWER(matchUmpires.umpire2FullName) like :search)'
                , { search: `%${requestFilter.search.toLowerCase()}%` });
            }

            query.getMany();

        const matchCount = await query.getCount();
        const result = await query.skip(requestFilter.paging.offset).take(requestFilter.paging.limit).getMany();
        return {matchCount,result}
        
    }

    public async getById(id: number): Promise<MatchUmpires> {
        return this.entityManager.createQueryBuilder(MatchUmpires, 'matchUmpires')
            .leftJoinAndSelect('matchUmpires.umpire1Club', 'club1')
            .leftJoinAndSelect('matchUmpires.umpire2Club', 'club2')
            .leftJoinAndSelect('matchUmpires.umpire1User', 'user1')
            .leftJoinAndSelect('matchUmpires.umpire2User', 'user2')
            .where('matchUmpires.id = :id', {id})
            .getOne();
    }

    public async getFullById(id: number): Promise<MatchUmpires> {
        return this.entityManager.createQueryBuilder(MatchUmpires, 'matchUmpires')
            .innerJoinAndSelect('matchUmpires.match', 'match')
            .where('matchUmpires.id = :id', {id})
            .getOne();
    }

    public async deleteByMatchId(matchId: number): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(MatchUmpires)
            .andWhere("matchId = :matchId", {matchId}).execute();
    }
}
