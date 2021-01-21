import { Service } from "typedi";
import BaseService from "./BaseService";
import { Organisation } from "../models/security/Organisation";

@Service()
export default class OrganisationService extends BaseService<Organisation> {

    modelName(): string {
        return Organisation.name;
    }

    public async findByUniquekey(organisationUniquekey: string): Promise<number> {
        let query = this.entityManager.createQueryBuilder(Organisation, 'organisation')
        query.where('organisation.organisationUniquekey= :organisationUniquekey and isDeleted = 0', {organisationUniquekey})
        return (await query.getOne()).id;
    }
    public async findOrganisationByUniqueKey(organisationKey: string): Promise<Organisation> {
        return await this.entityManager.createQueryBuilder().select().from(Organisation, 'o')
            .andWhere("o.organisationUniqueKey = :organisationKey", { organisationKey })
            .andWhere("o.isDeleted = 0")
            .execute();
    }

    public async findOrganisationById(organisationId: number): Promise<Organisation> {
        return await this.entityManager.createQueryBuilder().select().from(Organisation, 'o')
            .andWhere("o.id = :organisationId", { organisationId })
            .andWhere("o.isDeleted = 0")
            .execute();
    }

    public async updateOrganisationWithAccountId(organisationKey: string, stripeKey: string): Promise<Organisation> {
        const currentTime = new Date();
        return await this.entityManager.query(
            `update wsa_users.organisation set stripeAccountID = ?, updatedOn = ? where organisationUniqueKey = ? and isDeleted = 0`, [stripeKey, currentTime, organisationKey]
        );
    }

    public async userOrganisation(userId){
        try{
            let result = await this.entityManager.query("call wsa_users.usp_user_organisation(?)",[userId]);
            return result[0];
        }catch(error){
            throw error;
        }
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
}
