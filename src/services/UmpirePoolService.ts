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
import {DeleteResult} from "typeorm-plus";

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

    async deleteOne(organisationId: number, competitionId: number, umpirePoolId: number): Promise<DeleteResult> {
        if (CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
            throw new ForbiddenError("Participated-in organization can't delete pools!")
        }

        const umpirePool = await this.entityManager.findOneOrFail(UmpirePool, umpirePoolId);

        return await this.deleteById(umpirePool.id);
    }

    async updateMany(organisationId: number, competitionId: number, body: UmpirePool[]): Promise<UmpirePool[]> {

        const updatedPools = [];

        for (const updateData of body) {
            const pool = await this.entityManager.findOneOrFail(UmpirePool, updateData.id, {
                relations: ["competition","umpires"]
            });
            const allowedUmpiresIds = (await this.umpireService.getAllowedUmpiresForOrganisation(competitionId, organisationId))
                .map(umpire => umpire.id);
            const assignedNotAllowedUmpires = pool.umpires.filter(umpire => !allowedUmpiresIds.includes(umpire.id));
            const allowedUmpiresIdsToBeAssigned = updateData.umpires.filter(umpire => allowedUmpiresIds.includes(this.retrievePoolUmpireId(umpire)));
            const allowedUmpiresToBeAssigned = await Promise.all(
                allowedUmpiresIdsToBeAssigned.map(umpireId => this.entityManager.findOneOrFail(User, umpireId))
            );
            const allowedUmpiresResult = [...assignedNotAllowedUmpires, ...allowedUmpiresToBeAssigned];
            pool.umpires = allowedUmpiresResult;
            const savedPool = await this.entityManager.save(pool);
            savedPool.umpires = allowedUmpiresResult;
            updatedPools.push(savedPool);
        }

        return updatedPools;
    }

    async getByCompetitionOrganisation(competitionId: number, organisationId: number): Promise<UmpirePool[]> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId);

        const competitionOrganisation = await this.competitionOrganisationService.getByCompetitionOrganisation(competitionId, organisationId);

        const umpirePools = await this.entityManager.createQueryBuilder(UmpirePool, 'umpirePools')
            .leftJoinAndSelect('umpirePools.competition', 'competition')
            .leftJoinAndSelect('competition.competitionOrganizations', 'competitionOrganizations')
            .leftJoinAndSelect('umpirePools.umpires', 'umpires')
            .loadRelationCountAndMap('umpires.matchesCount', 'umpires.matchUmpires')
            .leftJoinAndSelect('umpires.umpireCompetitionRank', 'umpireCompetitionRank')
            .leftJoinAndSelect('umpirePools.divisions', 'divisions')
            .where('umpirePools.competitionId = :competitionId', {competitionId})
            .getMany();

        for (const umpirePool of umpirePools) {
            for (const umpire of umpirePool.umpires) {
                umpire.rank = this.umpireService.calculateAverageRank(umpire);
                delete umpire.umpireCompetitionRank;
            }
        }


        if (!!competitionOrganisation && CompetitionParticipatingTypeEnum.PARTICIPATED_IN === await this.competitionOrganisationService.getCompetitionParticipatingType(competitionId, organisationId)) {
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

    retrievePoolUmpireId(umpire: User): number;
    retrievePoolUmpireId(umpire: number): number;

    retrievePoolUmpireId(umpire: any): number {
        if (Number.isInteger(umpire)) {
            return umpire as number;
        }

        return umpire.id;
    }
}
