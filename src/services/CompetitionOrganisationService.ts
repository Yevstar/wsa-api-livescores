import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionOrganisation } from "../models/CompetitionOrganisation";
import {LinkedCompetitionOrganisation} from '../models/LinkedCompetitionOrganisation';

@Service()
export default class CompetitionOrganisationService extends BaseService<CompetitionOrganisation> {

    modelName(): string {
        return CompetitionOrganisation.name;
    }

    public async findByCompetitionId(competitionId: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(CompetitionOrganisation, 'co');
        query.andWhere("co.competitionId = :competitionId", { competitionId });
        return query.getMany();
    }

    public async softDeleteByOrgId(compOrgId: number, compId: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(CompetitionOrganisation, 'competitionOrganisation');
        query.where("competitionOrganisation.orgId = :compOrgId and competitionOrganisation.competitionId = :compId", { compOrgId, compId });
        return await query.softDelete().execute();
    }

    public async findLinkedCompetitionOrganisation(id: number): Promise<LinkedCompetitionOrganisation> {
        let query = this.entityManager.createQueryBuilder(LinkedCompetitionOrganisation, 'linkedCompetitionOrganisation')
            .innerJoin(CompetitionOrganisation, 'competitionOrganisation',
              'linkedCompetitionOrganisation.organisationId = competitionOrganisation.orgId and ' +
              'linkedCompetitionOrganisation.competitionId = competitionOrganisation.competitionId and ' +
              'competitionOrganisation.id = :id', {id: id});

        return query.getOne();
    }
}
