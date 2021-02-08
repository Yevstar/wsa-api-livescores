import BaseService from "./BaseService";
import {User} from "../models/User";
import {BadRequestError, NotFoundError} from "routing-controllers";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";
import {Competition} from "../models/Competition";
import * as utils from '../utils/Utils';
import {CrudResponse} from "../controller/dto/CrudResponse";
import {Umpire} from "../models/Umpire";
import {Inject} from "typedi";
import CompetitionService from "./CompetitionService";
import {EntityType} from "../models/security/EntityType";
import {CompetitionOrganisation} from "../models/CompetitionOrganisation";
import {Role} from "../models/security/Role";
import {UmpirePool} from "../models/UmpirePool";
import CompetitionOrganisationService from "./CompetitionOrganisationService";
import {PermissionError} from "../exceptions/PermissionError";

export class UmpireService extends BaseService<User> {
    modelName(): string {
        return "Umpire";
    }

    @Inject()
    private readonly competitionService: CompetitionService;

    @Inject()
    private readonly competitionOrganisationService: CompetitionOrganisationService;

    async findManyByCompetitionIdForOrganisation(
        competitionId: number,
        organisationId: number,
        offset: number = 0,
        limit: number = 10,
        skipAssignedToPools: boolean = true,
        sortBy?: UmpiresSortType,
        sortOrder?: "ASC" | "DESC",
    ): Promise<CrudResponse<any>> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        const isCompetitionOrganizer = await this.competitionService.isCompetitionOrganiser(organisationId, competitionId);
        let competitionOrganizationsQuery = this.entityManager.createQueryBuilder(CompetitionOrganisation, 'compOrg');

        if (isCompetitionOrganizer) {
            competitionOrganizationsQuery
                .where("compOrg.competitionId = :competitionId", {
                    competitionId,
                });
        } else {
            competitionOrganizationsQuery
                .where("compOrg.orgId = :orgId AND compOrg.competitionId = :competitionId", {
                    orgId: organisationId,
                    competitionId,
                });
        }

        const compOrgs = await competitionOrganizationsQuery.getMany();
        const compOrgIds = compOrgs.length > 0 ? compOrgs.map(compOrg => compOrg.id) : [null];

        const query = this.entityManager.createQueryBuilder(User,"u")
            .leftJoinAndSelect("u.userRoleEntities", "roles")
            .leftJoinAndSelect("u.rank", "rank")
            .leftJoinAndSelect("rank.competition", "competition")
            .loadRelationCountAndMap('u.matchesCount', 'u.matchUmpires')
            .where("roles.entityTypeId = :entityTypeId AND roles.entityId IN (:compOrgIds) AND roles.roleId IN (:roles)", {
                entityTypeId: EntityType.COMPETITION_ORGANISATION,
                compOrgIds,
                roles: [Role.UMPIRE, Role.UMPIRE_COACH],
            })

        if (sortBy) {
            switch (sortBy) {
                case "email":
                    query.orderBy('u.email', sortOrder);
                    break;
                case "firstName":
                    query.orderBy('u.firstName', sortOrder);
                    break;
                case "lastName":
                    query.orderBy('u.lastName', sortOrder);
                    break;
                case "mobileNumber":
                    query.orderBy('u.mobileNumber', sortOrder);
                    break;
            }
        }

        if (skipAssignedToPools) {
            const attachedPoolsUmpiresIds = await this.entityManager.createQueryBuilder(UmpirePool,"up")
                .leftJoinAndSelect("up.umpires", "u")
                .where('up.competitionId = :competitionId', {competitionId})
                .getMany();

            const attachedUmpiresIds = attachedPoolsUmpiresIds.reduce((umpiresIdsAcc: [], pool: UmpirePool) => {
                const umpireIds = pool.umpires.map(umpire => umpire.id);

                return [...umpiresIdsAcc, ...umpireIds];
            }, []);

            const uniqueAttachedUmpiresIds = [...new Set(attachedUmpiresIds)];

            if (uniqueAttachedUmpiresIds.length > 0) {
                query.andWhere("u.id NOT IN (:attachedIds)", {
                    attachedIds: uniqueAttachedUmpiresIds,
                })
            }

        }

        const total = await query.getCount();
        query.take(limit).skip(offset);

        const umpires = await query.getMany();
        // for (const umpire of umpires) {
        //     umpire.rank = this.calculateAverageRank(umpire);
        // }
        return {
            ...utils.paginationData(total, limit, offset),
            data: umpires,
        };
    }

    async findOneByCompetitionId(
        userId: number,
        competitionId: number,
    ): Promise<User> {
        const umpire = this.entityManager.createQueryBuilder(User,"u")
            .leftJoinAndSelect("u.userRoleEntities", "roles")
            .leftJoinAndSelect("u.umpireCompetitionRank", "umpireCompetitionRank")
            .where("roles.entityTypeId = :entityTypeId AND roles.entityId = :entityId AND roles.roleId IN (15,20)", {
                entityTypeId: 1,
                entityId: competitionId,
            })
            .where("u.id = :userId", {
                userId: userId,
            })
            .getOne();

        if (!umpire) {
            throw new NotFoundError;
        }

        return umpire;
    }

    async findOneByUserId(userId: number): Promise<User> {
        const umpire = this.entityManager.createQueryBuilder(User,"u")
            .leftJoinAndSelect("u.userRoleEntities", "roles")
            .leftJoinAndSelect("u.umpireCompetitionRank", "umpireCompetitionRank")
            .where("roles.roleId IN (15,20)")
            .where("u.id = :userId", {
                userId: userId,
            })
            .getOne();

        if (!umpire) {
            throw new NotFoundError;
        }

        return umpire;
    }

    async updateRank(
        organisationId: number,
        competitionId: number,
        umpireId: number,
        rank: number,
        updateRankType: UpdateRankType = "shift",
    ): Promise<UmpireCompetitionRank> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId);
        const isCompetitionOrganizer = await this.competitionService.isCompetitionOrganiser(organisationId, competitionId);

        if (!isCompetitionOrganizer) {
            throw new PermissionError;
        }

        const umpire = await this.getUmpireRankAttachedToCompetition(umpireId, competitionId);

        if (!umpire) {
            throw new NotFoundError;
        }
        const currentUmpireCompetitionRank = await this.getUmpireRankForCompetition(umpireId, competitionId);

        if (currentUmpireCompetitionRank && currentUmpireCompetitionRank.rank === rank) {
            return;
        }

        const rankedUmpires = await this.competitionService.getRankedUmpiresCountForCompetition(competitionId);
        const vacantRank = rankedUmpires + 1;

        if (rank >= vacantRank) {
            rank = vacantRank;
            const umpireCompetitionRank = await this.entityManager.findOne(UmpireCompetitionRank, {
                umpireId: umpire.id,
                competitionId: competitionId,
                rank,
            }) || new UmpireCompetitionRank;

            umpireCompetitionRank.umpireId = umpireId;
            umpireCompetitionRank.competitionId = competitionId;
            umpireCompetitionRank.rank = rank;

            await this.entityManager.save(umpireCompetitionRank);
            return;
        }

        if (rank < vacantRank) {
            switch (updateRankType) {
                case "replace":
                    await this.replaceUmpiresInRanksList(
                        competitionId,
                        umpireId,
                        rank,
                        rankedUmpires,
                        currentUmpireCompetitionRank,
                    );
                    return;

                case "shift":
                    await this.shiftUmpiresRanksList(competitionId, umpireId, rank, currentUmpireCompetitionRank);
                    return;
            }
        }
    }

    calculateAverageRank(umpire: User): number {
        if (umpire.umpireCompetitionRank.length === 0) {
            return 0;
        }

        return umpire.umpireCompetitionRank
            .map(umpireCompetitionRank => umpireCompetitionRank.rank)
            .reduce((prev, curr) => prev + curr, 0)
            / umpire.umpireCompetitionRank.length;
    }

    async findByMatchUmpire(matchUmpireId: number): Promise<User> {

        return await this.entityManager.createQueryBuilder(User,"u")
            .leftJoinAndSelect("u.matchUmpires", "matchUmpires")
            .where("matchUmpires.id = :matchUmpireId", {matchUmpireId})
            .getOne();
    }

    async getAllowedUmpiresForOrganisation(
        competitionId: number,
        organisationId: number,
    ): Promise<Umpire[]> {
        const paginatedUmpires = await this.findManyByCompetitionIdForOrganisation(
            competitionId,
            organisationId,
            0,
            10000,
            false
        );

        return paginatedUmpires.data;
    }

    async addOrganisationNameToUmpiresWithURE(umpires: User[]): Promise<User[]> {
        if (umpires.length === 0) {
            return umpires;
        }

        const compOrgIds = umpires.reduce((orgIds: number[], currentUmpire: User) => {
            const userRoleEntitiesIds = currentUmpire.userRoleEntities
                .filter(ure => ure.entityTypeId === EntityType.COMPETITION_ORGANISATION)
                .map(ure => ure.entityId);

            return [...orgIds, ...userRoleEntitiesIds];
        }, []);

        const uniqueCompOrgIds = [...new Set(compOrgIds)];

        const compOrgs = await this.competitionOrganisationService.getWithOrganisationByIds(uniqueCompOrgIds);

        umpires.forEach(umpire => {
            umpire.organisationName = compOrgs.reduce((orgName: string, currentCompOrg: CompetitionOrganisation) => {
                let currentName;
                for (const ure of umpire.userRoleEntities) {
                    if (ure.entityId === currentCompOrg.id) {
                        currentName = currentCompOrg.organisation.name;
                        break;
                    }
                }

                return currentName ?? orgName;
            }, '');
        });

        return umpires;
    }

    async getUmpireRankAttachedToCompetition(umpireId: number, competitionId: number): Promise<User> {

        const competitionOrganization = await this.entityManager.createQueryBuilder(CompetitionOrganisation, 'compOrg')
            .where("compOrg.competitionId = :competitionId", {competitionId})
            .getMany();

        if (!competitionOrganization.length) {
            return null;
        }

        return await this.entityManager.createQueryBuilder(User, 'u')
            .leftJoinAndSelect('u.userRoleEntities', 'roles')
            .where("roles.userId = :umpireId AND roles.entityTypeId = :entityTypeId AND roles.entityId IN (:compOrgIds) AND roles.roleId IN (:roles)", {
                entityTypeId: EntityType.COMPETITION_ORGANISATION,
                compOrgIds: competitionOrganization.map(compOrg => compOrg.id),
                roles: [Role.UMPIRE, Role.UMPIRE_COACH],
                umpireId,
            })
            .getOne();
    }

    async shiftUmpiresRanksList(
        competitionId: number,
        umpireId: number,
        rank: number,
        currentUmpireCompetitionRank: UmpireCompetitionRank,
    ): Promise<void> {
        const competitionRanks = await this.competitionService.getCompetitionRanks(competitionId);
        let newlyCreatedCurrentCompetitionRank = false;
        if (!currentUmpireCompetitionRank) {
            newlyCreatedCurrentCompetitionRank = true;
            currentUmpireCompetitionRank = new UmpireCompetitionRank;
            currentUmpireCompetitionRank.competitionId = competitionId;
            currentUmpireCompetitionRank.umpireId = umpireId;
        }

        let affectedCompetitionRanks = [];
        if (newlyCreatedCurrentCompetitionRank) {
            affectedCompetitionRanks = competitionRanks.filter(
                competitionRank => competitionRank.rank >= rank
                    && competitionRank.umpireId !== umpireId
            );
        }

        if (!newlyCreatedCurrentCompetitionRank) {
            affectedCompetitionRanks = competitionRanks.filter(
                competitionRank => competitionRank.rank >= rank
                    && competitionRank.umpireId !== umpireId
                    && competitionRank.rank < currentUmpireCompetitionRank.rank
            );
        }
        currentUmpireCompetitionRank.rank = rank;

        const competitionRanksToBeUpdated = affectedCompetitionRanks.map(competitionRank => {
            ++competitionRank.rank;

            return competitionRank;
        });
        await this.entityManager.save([currentUmpireCompetitionRank, ...competitionRanksToBeUpdated]);
    }

    async replaceUmpiresInRanksList(
        competitionId: number,
        umpireId: number,
        rank: number,
        rankedUmpires: number,
        currentUmpireRank: UmpireCompetitionRank,
    ): Promise<void> {
        const competitionRanks = await this.competitionService.getCompetitionRanks(competitionId);
        const umpireRankToBeReplaced = competitionRanks.find(competitionRank => competitionRank.rank === rank);
        if (!currentUmpireRank) {
            currentUmpireRank = new UmpireCompetitionRank;
            currentUmpireRank.umpireId = umpireId;
            currentUmpireRank.competitionId = competitionId;
        }

        umpireRankToBeReplaced.rank = currentUmpireRank.rank ?? rankedUmpires + 1;
        currentUmpireRank.rank = rank;

        await this.entityManager.save([currentUmpireRank, umpireRankToBeReplaced]);
    }

    async getUmpireRankForCompetition(umpireId: number, competitionId: number): Promise<UmpireCompetitionRank> {

        return await this.entityManager.findOne(UmpireCompetitionRank, {
            umpireId,
            competitionId,
        });
    }
}

export type UmpiresSortType = "firstName" | "lastName" | "email" | "mobileNumber";
export type UpdateRankType = "shift" | "replace";
