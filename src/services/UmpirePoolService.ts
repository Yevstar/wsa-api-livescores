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
        body.umpires = await this.setUmpires(body.umpires);

        return await this.createOrUpdate(body);
    }

    async updateMany(competitionId: number, body: UmpirePool[]): Promise<UmpirePool[]> {
        const updatedPools = [];

        for (const updateData of body) {
            const pool = await this.entityManager.findOneOrFail(UmpirePool, updateData.id, {
                relations: ["competition","umpires"]
            });

            pool.umpires = await this.setUmpires(updateData.umpires);

            updatedPools.push(await this.entityManager.save(pool));
        }

        return updatedPools;
    }

    async getByCompetitionId(competitionId: number): Promise<UmpirePool[]> {
        return this.entityManager.find(UmpirePool, {
            where: {
                competitionId: competitionId,
            },
            relations: ["competition","umpires"]
        });
    }

    async setUmpires(umpireIds: Umpire[]): Promise<Umpire[]> {
        return await Promise.all(
            umpireIds.map(async umpireId => {
                return this.entityManager.findOneOrFail(Umpire, umpireId);
            })
        );
    }
}