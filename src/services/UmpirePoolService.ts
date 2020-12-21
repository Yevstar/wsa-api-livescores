import BaseService from "./BaseService";
import {UmpirePool} from "../models/UmpirePool";
import {Competition} from "../models/Competition";
import {Umpire} from "../models/Umpire";
import {Inject} from "typedi";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {CompetitionParticipatingTypeEnum} from "../models/enums/CompetitionParticipatingTypeEnum";
import {ForbiddenError} from "routing-controllers";

export class UmpirePoolService extends BaseService<UmpirePool> {
    modelName(): string {
        return UmpirePool.name;
    }

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    async createOne(organisationId: number, competitionId: number, body: UmpirePool): Promise<UmpirePool> {

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("Participated-in organization can't create pools!")
        }

        body.competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        body.umpires = await this.setUmpires(body.umpires);

        return await this.createOrUpdate(body);
    }

    async updateMany(organizationId: number, competitionId: number, body: UmpirePool[]): Promise<UmpirePool[]> {

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organizationId)) {
            throw new ForbiddenError("Participated-in organization can't update pools!")
        }

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

    protected async setUmpires(umpireIds: Umpire[]): Promise<Umpire[]> {
        return await Promise.all(
            umpireIds.map(async umpireId => {
                return this.entityManager.findOneOrFail(Umpire, umpireId);
            })
        );
    }
}