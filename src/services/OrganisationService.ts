import {Service} from "typedi";
import BaseService from "./BaseService";
import {LinkedCompetitionOrganisation} from "../models/LinkedCompetitionOrganisation";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class OrganisationService extends BaseService<LinkedCompetitionOrganisation> {

    modelName(): string {
        return LinkedCompetitionOrganisation.name;
    }

    public async findByNameAndCompetitionId(name: string, competitionId?: number): Promise<LinkedCompetitionOrganisation[]> {
        let query = this.entityManager.createQueryBuilder(LinkedCompetitionOrganisation, 'competitionOrganisation');
        if (name) {
            query = query.where('LOWER(competitionOrganisation.name) like :name', {name: `${name.toLowerCase()}%`});
        }

        if (competitionId) {
            query = query.andWhere('competitionOrganisation.competitionId = :competitionId', {competitionId});
        }
        return query.getMany()
    }

    public async findByUniqueKey(organisationKey: string): Promise<any> {
        const query = await this.entityManager.query(
            `select o.* from wsa_users.organisation as o where o.organisationUniqueKey = ? and o.isDeleted = 0`
            , [organisationKey]);
        if (isArrayPopulated(query)) {
            return query[0].id;
        } else {
            return 0;
        }
    }

    public async findAffiliateDetailsByOrganisationId(organisationId: number): Promise<any> {
        const query = await this.entityManager.query(
            `select a2.* from wsa_users.affiliate a2 where a2.affiliateOrgId = ? and a2.isDeleted = 0`
            , [organisationId]);
        if (isArrayPopulated(query)) {
            return query[0].organisationTypeRefId;
        } else {
            return 0;
        }
    }

}
