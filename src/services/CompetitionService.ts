import {Service} from "typedi";
import BaseService from "./BaseService";
import {Competition} from "../models/Competition";
import {Brackets, DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber, objectIsNotEmpty, isNotNullAndUndefined, isArrayPopulated } from "../utils/Utils";

@Service()
export default class CompetitionService extends BaseService<Competition> {

    modelName(): string {
        return Competition.name;
    }

    public async findById(id: number): Promise<Competition> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
            .leftJoinAndSelect('competition.competitionOrganisation', 'competitionOrganisation')
            .leftJoinAndSelect('competition.competitionVenues', 'competitionVenue')
            .leftJoinAndSelect('competitionVenue.venue', 'venue');

        query.andWhere("competition.id = :id", { id });
        return query.getOne();
    }


    public async findByName(name?: string, locationId?: number): Promise<Competition[]> {
        let query = this.entityManager.createQueryBuilder(Competition, 'competition')
            .leftJoinAndSelect('competition.competitionOrganisation', 'competitionOrganisation')
            .leftJoinAndSelect('competition.competitionVenues', 'competitionVenue')
            .leftJoinAndSelect('competitionVenue.venue', 'venue')
            .leftJoinAndSelect('competition.location', 'location');
        if (locationId) {
            query.andWhere('competition.locationId = :locationId', {locationId});
        }

        if (name) {
            query.andWhere(new Brackets(qb => {
                qb.orWhere('LOWER(competition.name) like :name', {name: `%${name.toLowerCase()}%`});
                qb.orWhere('LOWER(competition.longName) like :name', {name: `%${name.toLowerCase()}%`});
                qb.orWhere('LOWER(competitionOrganisation.name) like :name', {name: `%${name.toLowerCase()}%`});
                qb.orWhere('LOWER(venue.name) like :name', {name: `%${name.toLowerCase()}%`});
                qb.orWhere('LOWER(venue.shortName) like :name', {name: `%${name.toLowerCase()}%`});
            }));

        }
        query.andWhere('competition.deleted_at is null')
        return query.getMany();
    }

    public async loadAdmin(userId: number, requestFilter: RequestFilter, organisationId: number, recordUmpireType: "NONE" | "NAMES" | "USERS",yearRefId:number,
    sortBy:string = undefined, sortOrder:"ASC"|"DESC"=undefined): Promise<any> {
        const offset = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.offset) ? requestFilter.paging.offset : null;
        const limit = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.limit) ? requestFilter.paging.limit : null;
        const recordUmpireType_ = isNotNullAndUndefined(recordUmpireType) ? recordUmpireType : null;
        let result = await this.entityManager.query("call wsa.usp_get_competitions(?,?,?,?,?,?,?,?)",
            [userId, organisationId, limit, offset, recordUmpireType_, yearRefId, sortBy, sortOrder]);

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

    public async loadDashboardOwnedAndParticipatingCompetitions(userId: number, requestFilter: RequestFilterCompetitionDashboard, organisationId: number, yearRefId:number, sortBy: string = undefined, sortOrder: "ASC" | "DESC" = undefined): Promise<any> {

        const offsetOwned = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.offsetOwned) ? requestFilter.paging.offsetOwned : null;
        const offsetParticipating = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.offsetParticipating) ? requestFilter.paging.offsetParticipating : null;
        const limitOwned = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.limitOwned) ? requestFilter.paging.limitOwned : null;
        const limitParticipating = objectIsNotEmpty(requestFilter) && objectIsNotEmpty(requestFilter.paging) && isNotNullAndUndefined(requestFilter.paging.limitParticipating) ? requestFilter.paging.limitParticipating : null;

        let result = await this.entityManager.query("call wsa.usp_get_owned_and_participating_competitions(?,?,?,?,?,?,?,?,?)",
            [userId, organisationId, sortBy, sortOrder, yearRefId, offsetOwned, limitOwned, offsetParticipating, limitParticipating]);
        if (isArrayPopulated(result)) {
            let ownedCompetitions = Object.assign({});
            let participatingInCompetitions = Object.assign({});

            const ownedCompetitionsData = result[0];
            const participatingCompetitionsData = result[2];

            let responseObject: any = Object.assign({}, { ownedCompetitions: {}, participatingInCompetitions: {} });

            if (offsetOwned !== null && limitOwned !== null && offsetParticipating !== null && limitParticipating !== null) {
                const totalCountOwned = (result[1] && result[1].find(x => x)) ? result[1].find(x => x).totalCount : 0;
                const totalCountParticipating = (result[3] && result[3].find(x => x)) ? result[3].find(x => x).totalCount : 0;

                ownedCompetitions = paginationData(stringTONumber(totalCountOwned), limitOwned, offsetOwned);
                ownedCompetitions['competitions'] = ownedCompetitionsData;

                participatingInCompetitions = paginationData(stringTONumber(totalCountParticipating), limitParticipating, offsetParticipating);
                participatingInCompetitions['competitions'] = participatingCompetitionsData;

                responseObject.ownedCompetitions = ownedCompetitions;
                responseObject.participatingInCompetitions = participatingInCompetitions;
            } else {
                responseObject.ownedCompetitions = ownedCompetitionsData;
                responseObject.participatingInCompetitions = participatingCompetitionsData;
            }

            return responseObject;

        } else {
            return [];
        }
    }
}

export interface RequestFilterCompetitionDashboard {
    paging: {
        offsetOwned: number;
        offsetParticipating: number;
        limitOwned: number;
        limitParticipating: number;
    };
    search: string;
}