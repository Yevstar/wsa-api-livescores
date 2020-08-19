import {Service} from "typedi";
import BaseService from "./BaseService";
import {Watchlist} from "../models/Watchlist";
import {Brackets, DeleteResult} from "typeorm-plus";
import {LinkedCompetitionOrganisation} from "../models/LinkedCompetitionOrganisation";
import {Team} from "../models/Team";
import {EntityType} from "../models/security/EntityType";
import {UserDevice} from "../models/UserDevice";

@Service()
export default class WatchlistService extends BaseService<Watchlist> {

    modelName(): string {
        return Watchlist.name;
    }

    public async findByParam(userId: number = undefined, deviceId: string = undefined): Promise<Watchlist[]> {
        let query = this.entityManager.createQueryBuilder(Watchlist, 'wl');
        if (userId) {
            query.andWhere('wl.userId = :userId', {userId})
        } else if (deviceId) {
            query.andWhere('wl.deviceId = :deviceId and wl.userId is null', {deviceId});
        } else {
            return [];
        }
        return query.getMany();
    }

    public async findOrganisationByParam(userId: number = undefined, deviceId: string = undefined): Promise<LinkedCompetitionOrganisation[]> {
        let query = this.entityManager.createQueryBuilder(LinkedCompetitionOrganisation, 'competitionOrganisation');
        query.andWhere('competitionOrganisation.id in ' + this.watchlistSubQuery(query, 'ORGANISATION', userId, deviceId));
        return query.getMany();
    }

    public async findTeamByParam(userId: number = undefined, deviceId: string = undefined): Promise<Team[]> {
        let query = this.entityManager.createQueryBuilder(Team, 'team')
            .leftJoinAndSelect('team.division', 'division')
            .leftJoinAndSelect('team.competition', 'competition')
            .leftJoinAndSelect('team.competitionOrganisation', 'competitionOrganisation');
        query.andWhere('team.id in ' + this.watchlistSubQuery(query, 'TEAM', userId, deviceId));
        return query.getMany();
    }

    private watchlistSubQuery(query, entityType: string, userId: number = undefined, deviceId: string = undefined) {
        query.subQuery().select("wl.entityId")
            .from(Watchlist, "wl")
            .innerJoin(EntityType, 'et', 'et.id = wl.entityTypeId')
            .andWhere("et.name = :entityType", {entityType});
        if (userId) query.andWhere('wl.userId = :userId', {userId});
        if (deviceId) query.andWhere('wl.userId = :deviceId', {deviceId});
        return query.getQuery();
    }

    public async deleteByDeviceId(deviceId: string, userId: number = undefined): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder().delete().from(Watchlist)
            .andWhere("deviceId = :deviceId", {deviceId});
        if (userId) {
            query.andWhere("userId = :userId", {userId});
        } else query.andWhere("userId is null");
        return query.execute();
    }

    public async loadByParam(matchId: number, teamIds: number[]): Promise<Watchlist[]> {
        return this.entityManager.query(
            'SELECT ud.deviceId as token\n' +
            'FROM userDevice ud\n' +
            'WHERE ud.userId in (select r.userId from roster r where r.matchId = ? and r.teamId in (?))\n' +
            'union\n' +
            'distinct\n' +
            'SELECT wl.deviceId as token\n' +
            'FROM watchlist wl inner join wsa_users.entityType et on (wl.entityTypeId = et.id)\n' +
            'WHERE (et.name = \'TEAM\' AND wl.entityId in (?))\n' +
            '   OR (et.name = \'ORGANISATION\' AND wl.entityId in (SELECT c.id AS c_id\n' +
            '                                               FROM team t\n' +
            '                                                        INNER JOIN linkedCompetitionOrganisation c ON c.id = t.organisationId\n' +
            '                                               WHERE t.id in (?)));'
            , [matchId, teamIds, teamIds, teamIds])
    }

    public async deleteByParam(userId: number, deviceId: string, entityId: number,
                               entityTypeId: number): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder().delete().from(Watchlist)
            .andWhere("entityId = :entityId", {entityId})
            .andWhere("entityTypeId = :entityTypeId", {entityTypeId});
        if (userId) {
            query.andWhere("userId = :userId", {userId});
        } else {
            query.andWhere("deviceId = :deviceId", {deviceId})
                .andWhere("userId is null");
        }

        return query.execute();
    }

    public async save(userId: number = undefined, deviceId: string = undefined, organisationIds: number[] = undefined,
                      teamIds: number[] = undefined) {
        let currentData = await this.findByParam(userId, deviceId);
        let records = [];
        if (userId || deviceId) {
            if (organisationIds) {
                for (const id of organisationIds) {
                    if (!currentData.find(y => y.entityTypeId == EntityType.ORGANISATION && y.entityId == id)) {
                        records.push(WatchlistService.createWatchListItem(deviceId, userId, id, EntityType.ORGANISATION));
                    }
                }

            }
            if (teamIds) {
                for (const id of teamIds) {
                    if (!currentData.find(y => y.entityTypeId == EntityType.TEAM && y.entityId == id)) {
                        records.push(WatchlistService.createWatchListItem(deviceId, userId, id, EntityType.TEAM));
                    }
                }
            }
        }

        await this.batchCreateOrUpdate(records);
    }

    private static createWatchListItem(deviceId: string, userId: number, organisationId, type: number): Watchlist {
        let wl = new Watchlist();
        wl.deviceId = deviceId ? deviceId : null;
        wl.userId = userId ? userId : null;
        wl.entityId = organisationId;
        wl.entityTypeId = type;
        return wl;
    }

    public async copyByUserId(deviceId: string, userId: number): Promise<any> {
        return this.entityManager.query('insert into watchlist (deviceId, entityId, entityTypeId) \n' +
            'select ?, entityId, entityTypeId\n' +
            'from watchlist\n' +
            'where userId = ?;', [deviceId, userId]);
    }

    public async updateDeviceId(oldDeviceId: string, newDeviceId: string): Promise<any> {
        return await this.entityManager.createQueryBuilder(Watchlist, 'wl').update()
            .set({deviceId: newDeviceId})
            .where("deviceId = :oldDeviceId", {oldDeviceId})
            .execute();
    }
}
