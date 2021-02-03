import BaseService from "./BaseService";
import {User} from "../models/User";
import {NotFoundError} from "routing-controllers";
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

export class UmpireService extends BaseService<User> {
    modelName(): string {
        return "Umpire";
    }

    @Inject()
    private readonly competitionService: CompetitionService;

    async findManyByCompetitionIdForOrganisation(
        competitionId: number,
        organisationId: number,
        offset: number = 0,
        limit: number = 10,
        onlyAttached: boolean = true
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
            .leftJoinAndSelect("u.umpireCompetitionRank", "umpireCompetitionRank")
            .leftJoinAndSelect("umpireCompetitionRank.competition", "competition")
            .where("roles.entityTypeId = :entityTypeId AND roles.entityId IN (:compOrgIds) AND roles.roleId IN (:roles)", {
                entityTypeId: EntityType.COMPETITION_ORGANISATION,
                compOrgIds,
                roles: [Role.UMPIRE, Role.UMPIRE_COACH],
            })

        if (onlyAttached) {
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
        for (const umpire of umpires) {
            umpire.rank = this.calculateAverageRank(umpire);
        }
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
        competitionId: number,
        umpireId: number,
        rank: number,
    ): Promise<UmpireCompetitionRank> {
        const competition = await this.entityManager.findOneOrFail(Competition, competitionId)
        const umpire = await this.findOneByCompetitionId(umpireId, competitionId);

        const umpireCompetitionRank = await this.entityManager.findOne(UmpireCompetitionRank, {
            umpireId: umpire.id,
            competitionId: competitionId
        }) || new UmpireCompetitionRank;

        umpireCompetitionRank.umpire = umpire;
        umpireCompetitionRank.competition = competition;
        umpireCompetitionRank.rank = rank;

        return this.entityManager.save(umpireCompetitionRank);
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
}