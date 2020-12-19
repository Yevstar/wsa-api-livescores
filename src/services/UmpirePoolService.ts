import BaseService from "./BaseService";
import {UmpirePool} from "../models/UmpirePool";
import {Competition} from "../models/Competition";
import {Umpire} from "../models/Umpire";

export class UmpirePoolService extends BaseService<UmpirePool> {
    modelName(): string {
        return UmpirePool.name;
    }

    async createOne(competitionId: number, body: UmpirePool): Promise<UmpirePool> {
        body.competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        body.umpires = await Promise.all(
            body.umpires.map(async umpireId => {
                return this.entityManager.findOneOrFail(Umpire, umpireId);
            })
        );

        return await this.createOrUpdate(body);
    }

    async getByCompetitionId(competitionId: number): Promise<UmpirePool[]> {
        return this.entityManager.find(UmpirePool, {
            where: {
                competitionId: competitionId,
            },
            relations: ["competition","umpires"]
        });
    }
}