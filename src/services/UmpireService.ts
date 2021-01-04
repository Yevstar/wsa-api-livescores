import BaseService from "./BaseService";
import {User} from "../models/User";
import {NotFoundError} from "routing-controllers";
import {UmpireCompetitionRank} from "../models/UmpireCompetitionRank";
import {Competition} from "../models/Competition";

export class UmpireService extends BaseService<User> {
    modelName(): string {
        return "Umpire";
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
}