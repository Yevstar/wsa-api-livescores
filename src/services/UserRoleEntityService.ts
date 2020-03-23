import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {DeleteResult} from "typeorm-plus";
import {EntityType} from "../models/security/EntityType";

@Service()
export default class UserRoleEntityService extends BaseService<UserRoleEntity> {

    modelName(): string {
        return UserRoleEntity.name;
    }

    public async deleteRoleFromTeam(teamId: number, roleId: number): Promise<DeleteResult> {
        let entityTypeId = EntityType.TEAM;
        let query = this.entityManager.createQueryBuilder().delete().from(UserRoleEntity)
            .andWhere("entityId = :teamId", {teamId});
            query.andWhere("entityTypeId = :entityTypeId", {entityTypeId});
        if (roleId) {
            query.andWhere("roleId = :roleId", {roleId});
        } 
        return query.execute();
    }
}
