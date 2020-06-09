import {Service} from "typedi";
import BaseService from "./BaseService";
import {Organisation} from "../models/Organisation";
import { isArrayEmpty } from "../utils/Utils";

@Service()
export default class OrganisationService extends BaseService<Organisation> {

    modelName(): string {
        return Organisation.name;
    }

    public async findByName(name?: string): Promise<Organisation[]> {
        let query = this.entityManager.createQueryBuilder(Organisation, 'organisation');
        if (name) {
            query = query.where('LOWER(organisation.name) like :name', {name: `${name.toLowerCase()}%`});
        }
        return query.getMany()
    }

    public async findByNameAndCompetitionId(name: string, competitionId: number): Promise<Organisation[]> {
        let query = this.entityManager.createQueryBuilder(Organisation, 'organisation');
        if (name) {
            query = query.where('LOWER(organisation.name) like :name', {name: `${name.toLowerCase()}%`});
        }

        if (competitionId) {
            query = query.andWhere('organisation.competitionId = :competitionId', {competitionId});
        }
        return query.getMany()
    }

    public async findByUniqueKey(organisationKey: string): Promise<any> {
        const query = await this.entityManager.query(
            `select o.* from wsa_users.organisation as o where o.organisationUniqueKey = ? and o.isDeleted = 0`
            , [organisationKey]);
        if (isArrayEmpty(query)) {
            return query[0].id;
        } else {
            return 0;
        }
    }
}
