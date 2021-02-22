import {Service} from "typedi";

import BaseService from "./BaseService";
import {Division} from "../models/Division";
import {Team} from "../models/Team";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class DivisionService extends BaseService<Division> {

    modelName(): string {
        return Division.name;
    }

    public async findByParams(
        competitionId: number,
        competitionOrganisationIds: number[],
        teamIds: number[],
        offset: number,
        limit: number,
        search: string,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Division, 'd')
            .innerJoinAndSelect('d.competition', 'competition')
            .leftJoin(Team, 'team', 'team.divisionId = d.id');

        if (competitionId) {
            query.andWhere("d.competitionId = :competitionId", {
                competitionId
            });
        }
        if (isArrayPopulated(competitionOrganisationIds)) {
            query.andWhere("team.competitionOrganisationId in " +
              "(:competitionOrganisationIds)", {competitionOrganisationIds});
        }
        if (isArrayPopulated(teamIds)) {
            query.andWhere("team.id in (:teamIds)", {teamIds});
        }

        if (search!==null && search!==undefined && search !== '') {
            query.andWhere('(LOWER(d.name) like :search)', { search: `%${search.toLowerCase()}%` });
        }
        if (sortBy) {
            query.orderBy(`d.${sortBy}`, sortOrder);
        }

        if (limit) {
            const countObj = await query.getCount()
            const result = await query.skip(offset).take(limit).getMany();
            return {countObj,result}
        } else {
            const countObj = null;
            const result = await query.getMany();
            return {countObj, result}
        }
    }

    public async findByName(name?: string, competitionId?: number): Promise<Division[]> {
        let query = this.entityManager.createQueryBuilder(Division, 'd')
        if (name && competitionId) {
            query = query.andWhere('LOWER(d.name) = :name', { name: `${name.toLowerCase()}` });
            query = query.andWhere('competitionId = :competitionId', { competitionId: `${competitionId}%` });
            return query.getMany();
        } else {
            return [];
        }
    }

    async getDrawsForCompetition(competitionId: number, rounds: number[]): Promise<Division[]> {
        const query = this.entityManager.createQueryBuilder(Division, 'd');
        if (rounds && rounds.length > 0) {
            query.leftJoinAndSelect(
                'd.rounds', 'r', 'r.divisionId = d.id and r.id in (:rounds)',
                {rounds},
            )
        } else {
            query.leftJoinAndSelect('d.rounds', 'r')

        }

        query.leftJoinAndSelect('r.matches', 'm')
            .leftJoinAndSelect('m.team1', 't1')
            .leftJoinAndSelect('t1.division', 'td')
            .leftJoinAndSelect('t1.linkedCompetitionOrganisation', 'linkedTeamOrg')
            .leftJoinAndSelect('linkedTeamOrg.organisation', 'teamOrg')
            .where('m.competitionId = :competitionId', {competitionId})

        return await query.getMany();
    }

}
