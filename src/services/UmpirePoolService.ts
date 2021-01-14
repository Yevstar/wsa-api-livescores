import BaseService from "./BaseService";
import {UmpirePool} from "../models/UmpirePool";
import {Competition} from "../models/Competition";
import {Inject} from "typedi";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {CompetitionParticipatingTypeEnum} from "../models/enums/CompetitionParticipatingTypeEnum";
import {ForbiddenError} from "routing-controllers";
import {User} from "../models/User";
import UserService from "./UserService";
import {UmpirePoolsAllocationUpdateDto} from "../models/dto/UmpirePoolsAllocationUpdateDto";
import {Division} from "../models/Division";
import {UmpireService} from "./UmpireService";

export class UmpirePoolService extends BaseService<UmpirePool> {
    modelName(): string {
        return UmpirePool.name;
    }

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    @Inject()
    private readonly userService: UserService;

    @Inject()
    private readonly umpireService: UmpireService;

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
            relations: ["competition","umpires","divisions"]
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
            umpireIds.map(umpireId => this.entityManager.findOneOrFail(User, umpireId))
        );
    }

    async updateUmpireAllocation(competitionId: number, body: UmpirePoolsAllocationUpdateDto): Promise<UmpirePool[]> {
        const umpirePools = [];
        for (const umpirePoolId in body.umpirePools) {
            const divisions = body.umpirePools[umpirePoolId];

            const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, {
                where: {
                    id: umpirePoolId,
                    competitionId: competitionId,
                }
            });

            umpirePool.divisions = await Promise.all(
                divisions.map(divisionId => this.entityManager.findOneOrFail(Division, divisionId))
            );

            umpirePools.push(await this.entityManager.save(umpirePool))
        }

        return umpirePools;
    }

    async addUmpireToPool(organisationId: number, competitionId: number, umpirePoolId: number, umpireId: number): Promise<UmpirePool> {
        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("Participated-in organization can't update pools!")
        }

        const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, umpirePoolId);
        const umpire = await this.umpireService.findOneByUserId(umpireId);

        if (!umpirePool.umpires.filter(item => umpire.id === item.id).length) {
            umpirePool.umpires.push(umpire);
        }

        return await this.entityManager.save(umpirePool);
    }
}
