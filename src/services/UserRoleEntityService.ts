import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {DeleteResult} from "typeorm-plus";
import {EntityType} from "../models/security/EntityType";
import {RoleFunction} from "../models/security/RoleFunction";

@Service()
export default class UserRoleEntityService extends BaseService<UserRoleEntity> {

    modelName(): string {
        return UserRoleEntity.name;
    }

    public async findTeamUREByParams(teamId: number, roleId: number): Promise<UserRoleEntity[]> {
      let entityTypeId = EntityType.TEAM;
      let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
          .andWhere("entityId = :teamId", {teamId});
          query.andWhere("entityTypeId = :entityTypeId", {entityTypeId});
      if (roleId) {
          query.andWhere("roleId = :roleId", {roleId});
      }
      query.andWhere("isDeleted = 0");
      
      return query.getMany();
    }

    public async deleteRoleByParams(
        entityId: number,
        entityTypeId: number,
        roleId: number = undefined,
        userId: number = undefined
    ): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder().delete().from(UserRoleEntity)
            .andWhere("entityId = :entityId", {entityId});
        query.andWhere("entityTypeId = :entityTypeId", {entityTypeId});
        
        if (roleId) {
            query.andWhere("roleId = :roleId", {roleId});
        }
        if (userId) {
            query.andWhere("userId = :userId", {userId});
        }
        return query.execute();
    }

    public async deleteTeamUre(teamId: number, userId: number): Promise<UserRoleEntity[]> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
                      .andWhere('ure.isDeleted = 0')
                      .andWhere('ure.entityId = :teamId', {teamId})
                      .andWhere('ure.entityTypeId = :entityTypeId', {entityTypeId: EntityType.TEAM});
        let updatedUREs = await query.getMany();

        await this.entityManager.createQueryBuilder(UserRoleEntity, 'userRoleEntity')
        .update(UserRoleEntity)
        .set({isDeleted: 1, updatedBy: userId, updatedAt: new Date()})
        .andWhere('userRoleEntity.entityId = :teamId', {teamId})
        .andWhere('userRoleEntity.entityTypeId = :entityTypeId', {entityTypeId: EntityType.TEAM})
        .execute();

        return updatedUREs;
    }

    public async getUserTeamChatRoleCount(teamId: number, userId: number): Promise<number> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
            .innerJoin(RoleFunction, 'fr', '(fr.roleId = ure.roleId and fr.functionId = 25)')
            .andWhere("userId = :userId", {userId})
            .andWhere("entityId = :teamId", {teamId})
            .andWhere("entityTypeId = :entityTypeId", {entityTypeId: EntityType.TEAM})
            .andWhere("isDeleted = 0");

        return query.getCount();
    }

    public async findUREsOfUser(userId: number): Promise<UserRoleEntity[]> {
      let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
          .andWhere("userId = :userId", {userId})
          .andWhere("isDeleted = 0");

      return query.getMany();
    }

    public async findCountByParams(
        entityTypeId: number,
        entityId: number,
        roleId: number,
        userId: number
    ): Promise<number> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure');
        if (entityTypeId) {
            query.andWhere('ure.entityTypeId = :entityTypeId', {entityTypeId});
        }
        if (entityId) {
            query.andWhere('ure.entityId = :entityId', {entityId});
        }
        if (roleId) {
            query.andWhere('ure.roleId = :roleId', {roleId});
        }
        if (userId) {
            query.andWhere('ure.userId = :userId', {userId});
        }
        query.andWhere('ure.isDeleted = 0');

        return query.getCount()
    }
}
