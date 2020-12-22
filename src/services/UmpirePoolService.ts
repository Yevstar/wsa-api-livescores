import BaseService from "./BaseService";
import {UmpirePool} from "../models/UmpirePool";
import {Competition} from "../models/Competition";
import {Inject} from "typedi";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {CompetitionParticipatingTypeEnum} from "../models/enums/CompetitionParticipatingTypeEnum";
import {ForbiddenError} from "routing-controllers";
import {User} from "../models/User";
import UserService from "./UserService";

export class UmpirePoolService extends BaseService<UmpirePool> {
    modelName(): string {
        return UmpirePool.name;
    }

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    @Inject()
    private readonly userService: UserService;

    async createOne(organisationId: number, competitionId: number, body: UmpirePool): Promise<UmpirePool> {

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("Participated-in organization can't create pools!")
        }

        const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(competitionId, organisationId);

        body.competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        body.umpires = await this.setUmpires(competitionOrganisation.id, body.umpires);

        return await this.createOrUpdate(body);
    }

    async updateMany(organisationId: number, competitionId: number, body: UmpirePool[]): Promise<UmpirePool[]> {

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("Participated-in organization can't update pools!")
        }

        const updatedPools = [];

        for (const updateData of body) {
            const pool = await this.entityManager.findOneOrFail(UmpirePool, updateData.id, {
                relations: ["competition","umpires"]
            });

            pool.umpires = await this.setUmpires(competitionId, updateData.umpires);

            updatedPools.push(await this.entityManager.save(pool));
        }

        return updatedPools;
    }

    async getByCompetitionOrganisation(competitionId: number, organisationId: number): Promise<UmpirePool[]> {
        const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(competitionId, organisationId);

        const umpirePools = await this.entityManager.find(UmpirePool, {
            where: {
                competitionId: competitionId,
            },
            relations: ["competition","umpires"]
        });

        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {

            for (const umpirePool of umpirePools) {
                const filteredUmpires = [];
                for (const umpire of umpirePool.umpires) {
                    if (await this.userService.isCompetitionOrganisationUmpire(competitionOrganisation.id, umpire.id)) {
                        filteredUmpires.push(umpire);
                    }
                }
                umpirePool.umpires = filteredUmpires;
            }
        }

        return umpirePools;
    }

    protected async setUmpires(competitionOrganisationId: number, umpireIds: User[]): Promise<User[]> {
        return await Promise.all(
            umpireIds.map(async umpireId => await this.entityManager.findOneOrFail(User, umpireId))
        );
    }
}