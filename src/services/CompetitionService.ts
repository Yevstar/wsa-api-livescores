import {Service} from "typedi";
import BaseService from "./BaseService";
import {Competition} from "../models/Competition";
import {Brackets, DeleteResult} from "typeorm-plus";
import {RequestFilter} from "../models/RequestFilter";
import {paginationData, stringTONumber } from "../utils/Utils";

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
    
    public async loadAdmin(userId: number, requestFilter: RequestFilter, organisationId: number): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_competitions(?,?,?,?)",
            [userId, organisationId, requestFilter.paging.limit, requestFilter.paging.offset]);

            if (result != null) {
                let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
                let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
                responseObject["competitions"] = result[0];
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
}

