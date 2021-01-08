import {Service} from "typedi";
import BaseService from "./BaseService";
import {Communication} from "../models/Communication";
import {DeleteResult} from "typeorm-plus";
import {isArrayPopulated} from "../utils/Utils";

@Service()
export default class CommunicationService extends BaseService<Communication> {
    modelName(): string {
        return Communication.name;
    }

    public async findByParam(
        entityId: number = undefined,
        entityTypeId: number = undefined
    ): Promise<Communication[]> {
        let query = this.entityManager.createQueryBuilder(Communication, 'communication')
            .select('distinct communication.*')
        if (entityId && entityTypeId) {
            query.andWhere("communication.entityId = :entityId and communication.entityTypeId = :entityTypeId", {entityId, entityTypeId})
                .andWhere("communication.deleted_at is null")
                .orderBy("communication.updated_at", "DESC");
        } else {
            return []
        }
        return query.getRawMany();
    }

    public async findUserCommunication(
        userId: number = undefined,
        deviceId: string = undefined
    ): Promise<Communication[]> {
        let result = await this.entityManager.query("call wsa.usp_get_communication(?, ?)",[userId, deviceId]);
        if (isArrayPopulated(result)) {
            return result[0];
        } else {
            return [];
        }
    }

    public async findCommunicationByEntityId(entityId:number):Promise<any> {
        let query = this.entityManager.createQueryBuilder(Communication, 'communication')
            .select('distinct communication.*')
        query.andWhere("communication.entityId = :entityId", {entityId})
            .andWhere("communication.entityTypeId = 1")
            .andWhere("communication.deleted_at is null")
            .andWhere("communication.communication_expire_date is not null")
            .andWhere("communication.isActive = 1")
            .andWhere("communication.communication_expire_date > DATE_SUB(NOW(), INTERVAL 1 DAY)")
            .orderBy("communication.updated_at", "DESC");
        return query.getRawMany();
    }

    public async softDelete(id: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder(Communication, 'communication');
        query.andWhere("communication.id = :id", { id });
        return query.softDelete().execute();
    }

    public async findTodayCommunicationsByEntityId(entityId: number, currentTime: Date): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Communication, 'communication')
            .select('distinct communication.*')
        query.andWhere("communication.entityId = :entityId", { entityId })
            .andWhere("communication.entityTypeId = 1")
            .andWhere("communication.deleted_at is null")
            .andWhere("communication.isActive = 1")
            .andWhere("( communication.communication_expire_date >= cast(:currentTime as datetime) or communication.communication_expire_date is null )", { currentTime })
            .orderBy("communication.updated_at", "DESC");
        return query.getRawMany();
    }
}
