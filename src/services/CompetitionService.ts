import {Service} from "typedi";
import BaseService from "./BaseService";
import {Competition} from "../models/Competition";
import {Brackets, DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber, objectIsNotEmpty, isNotNullAndUndefined } from "../utils/Utils";

@Service()
export default class CompetitionService extends BaseService<Competition> {

    modelName(): string {
        return Competition.name;
    }

    public async findById(id: number): Promise<Competition> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
            .leftJoinAndSelect('competition.competitionVenues', 'competitionVenue')
            .leftJoinAndSelect('competitionVenue.venue', 'venue');

        query.andWhere("competition.id = :id", { id });
        return query.getOne();
    }


    public async findByName(name?: string, locationId?: number): Promise<Competition[]> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
            .leftJoinAndSelect('competition.location', 'location');
        if (locationId) {
            query.andWhere('competition.locationId = :locationId', {locationId});
        }

        if (name) {
            query.andWhere(new Brackets(qb => {
                qb.where('LOWER(competition.name) like :name', {name: `${name.toLowerCase()}%`});
                qb.orWhere('LOWER(competition.longName) like :name', {name: `${name.toLowerCase()}%`});
            }));

        }
        query.andWhere('competition.deleted_at is null')
        return query.getMany();
    }

    public async loadAdmin(userId: number, requestFilter: RequestFilter, organisationId: number, recordUmpireType: "NONE" | "NAMES" | "USERS"): Promise<any> {
        const offset = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.offset) ? requestFilter.paging.offset : null;
        const limit = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.limit) ? requestFilter.paging.limit : null;
        const recordUmpireType_ = isNotNullAndUndefined(recordUmpireType) ? recordUmpireType : null;
        let result = await this.entityManager.query("call wsa.usp_get_competitions(?,?,?,?,?)",
            [userId, organisationId, limit, offset, recordUmpireType_]);

        if (result != null) {
            let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
            let responseObject: any;
            if (offset !== null && limit !== null) {
                responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["competitions"] = result[0];
            } else {
                responseObject = result[0];
            }
            return responseObject;
        } else {
            return [];
        }
    }
    public async softDelete(id: number, userId: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition');
        query.andWhere("competition.id = :id", { id });
        return query.softDelete().execute();
    }

    public async getCompetitionByUniquekey(uniqueKey: string): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
        query.andWhere("competition.uniqueKey = :uniqueKey", { uniqueKey });
        query.andWhere('competition.deleted_at is null')
        return query.getOne();
    }

    public async getCompetitionsPublic(organisationId: number): Promise<any> {
        return await this.entityManager.query(
            'select distinct c.*\n' +
            'from competition c, competitionOrganisation co\n' +
            'where \n' +
            '   ((c.id = co.competitionId and c.organisationId = ?)\n' +
            ' or (c.id = co.competitionId and co.orgId = ?))\n' +
            ' and c.deleted_at is null \n' +
            'order by c.name ASC', [organisationId, organisationId]);
    }

    public async getAllAffiliatedOrganisations(organisationId: number, invitorId: number, organisationTypeRefId: number): Promise<any> {
        if (organisationTypeRefId === 2) {
            //State
            if (invitorId === 3) {
                // in case of Associations
                return await this.entityManager.query(`select a.affiliateOrgId as organisationId from wsa_users.affiliate a where a.organisationTypeRefId = 3
                and a.affiliatedToOrgId = ? and a.isDeleted = 0`, [organisationId]);
            } else if (invitorId === 4) {
                // in case of Clubs
                return await this.entityManager.query(` select a.affiliateOrgId as organisationId from wsa_users.affiliate a where a.isDeleted = 0 and 
                a.organisationTypeRefId = 4 and a.affiliatedToOrgId in (select a2.affiliateOrgId from wsa_users.affiliate a2 where 
                a2.organisationTypeRefId = 3 and a2.affiliatedToOrgId = ? and a2.isDeleted = 0)`, [organisationId]);
            } else return [];
        } else if (organisationTypeRefId === 3) {
            // Associations
            if (invitorId === 4) {
                // in case of Clubs
                return await this.entityManager.query(`select a.affiliateOrgId as organisationId from wsa_users.affiliate a where a.organisationTypeRefId = 4
                and a.affiliatedToOrgId = ? and a.isDeleted = 0`, [organisationId]);
            } else return [];
        }
    }

    public async findByUniquekey(competitionUniquekey: string): Promise<number> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
        query.where('competition.uniqueKey= :competitionUniquekey and competition.deleted_at is null', {competitionUniquekey})
        return (await query.getOne()).id;
    }
}
