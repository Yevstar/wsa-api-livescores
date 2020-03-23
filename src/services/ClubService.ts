import {Service} from "typedi";
import BaseService from "./BaseService";
import {Club} from "../models/Club";

@Service()
export default class ClubService extends BaseService<Club> {

    modelName(): string {
        return Club.name;
    }

    public async findByName(name?: string): Promise<Club[]> {
        let query = this.entityManager.createQueryBuilder(Club, 'club');
        if (name) {
            query = query.where('LOWER(club.name) like :name', {name: `${name.toLowerCase()}%`});
        }
        return query.getMany()
    }

    public async findByNameAndCompetitionId(name: string, competitionId: number): Promise<Club[]> {
        let query = this.entityManager.createQueryBuilder(Club, 'club');
        if (name) {
            query = query.where('LOWER(club.name) like :name', {name: `${name.toLowerCase()}%`});
        }

        if (competitionId) {
            query = query.andWhere('club.competitionId = :competitionId', {competitionId});
        }
        return query.getMany()
    }
}

