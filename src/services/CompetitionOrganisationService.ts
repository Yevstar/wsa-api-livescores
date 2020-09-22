import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionOrganisation } from "../models/CompetitionOrganisation";

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

    public async softDeleteByOrgId(compOrgId: any): Promise<any> {
        let query = this.entityManager.createQueryBuilder(CompetitionOrganisation, 'co');
        query.andWhere("co.orgId = :compOrgId", { compOrgId });
        return query.softDelete().execute();
    }
}