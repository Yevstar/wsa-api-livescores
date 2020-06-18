import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserDevice} from "../models/UserDevice";
import {Brackets, DeleteResult, EntityManager} from "typeorm-plus";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {Match} from "../models/Match";
import {Roster} from "../models/security/Roster";
import {EntityType} from "../models/security/EntityType";
import {News} from "../models/News";

@Service()
export default class UserDeviceService extends BaseService<UserDevice> {

    modelName(): string {
        return UserDevice.name;
    }

    public async getUserDevices(userId: number): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .where('ud.userId = :userId', {userId})
            .getMany();
    }

    public async getUserTokens(userIds: number[]): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .where('ud.userId in (:userIds)', {userIds})
            .getMany();
    }

    public async loadDeviceByToken(deviceId: string): Promise<UserDevice> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .andWhere('ud.deviceId = :deviceId', {deviceId})
            .getOne();
    }

    public async saveDevice(deviceId: string, userId: number): Promise<UserDevice> {
        let device = await this.loadDeviceByToken(deviceId);
        if (!device) {
            device = new UserDevice();
            device.deviceId = deviceId;
        }
        device.userId = userId ? userId : null;
        return this.entityManager.save(device);
    }


    public async removeDevice(deviceId: string): Promise<DeleteResult> {
        let query = this.entityManager.createQueryBuilder().delete().from(UserDevice);
        query.andWhere("deviceId = :deviceId", {deviceId});
        return query.execute();
    }

    public async findManagerDevice(teamId: number): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .innerJoin(UserRoleEntity, 'ure', 'ure.userId = user.id')
            .innerJoin('ure.role', 'r')
            .innerJoin('ure.entityType', 'et')
            .andWhere("r.name = 'manager'")
            .andWhere("et.name = 'TEAM'")
            .andWhere('ure.entityId = :teamId', {teamId})
            .getMany();
    }

    public async findManagerAndCoachDevices(teamId: number): Promise<UserDevice[]> {
        return this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .innerJoin(UserRoleEntity, 'ure', 'ure.userId = user.id')
            .innerJoin('ure.role', 'r')
            .innerJoin('ure.entityType', 'et')
            .andWhere("r.name = 'manager' or r.name = 'coach'")
            .andWhere("et.name = 'TEAM'")
            .andWhere('ure.entityId = :teamId', {teamId})
            .getMany();
    }

    public async findDeviceByMatch(match: Match): Promise<UserDevice[]> {
        let query = this.entityManager.createQueryBuilder(UserDevice, 'ud');
        query.andWhere('ud.userId in ' + query.subQuery().select("ure.userId")
            .from(UserRoleEntity, "ure")
            .innerJoin('ure.role', 'r')
            .innerJoin('ure.entityType', 'et')
            .andWhere("r.name = 'manager'")
            .andWhere(new Brackets(qb => {
                qb.orWhere(
                    "(ure.entityId = :team1Id and ure.entityTypeId = :entityTypeId1) or " +
                    "(ure.entityId = :team2Id and ure.entityTypeId = :entityTypeId2)", {
                        team1Id: match.team1Id,
                        entityTypeId1: EntityType.TEAM,
                        team2Id: match.team2Id,
                        entityTypeId2: EntityType.TEAM,
                    })
            })).getQuery());
        query.orWhere('ud.userId in ' + query.subQuery().select("r.userId")
            .from(Roster, "r")
            .innerJoin('r.role', 'role')
            .andWhere("role.name = 'scorer'")
            .andWhere("r.matchId = :matchId", {matchId: match.id}).getQuery());
        return query.getMany();
    }

    public async findScorerDeviceFromRoster(matchId: number, rosterId: number = undefined): Promise<UserDevice[]> {
        let query = this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .innerJoin(Roster, 'rst', 'rst.userId = user.id')
            .innerJoin('rst.role', 'role')
            .andWhere("role.name = 'scorer'");
        if (rosterId) query.andWhere("rst.id = :rosterId", {rosterId});
        if (matchId) query.andWhere("rst.matchId = :matchId", {matchId});
        return query.getMany();
    }

    public async findDeviceFromRosterByRole(roleIds: number[]): Promise<UserDevice[]> {
        let query = this.entityManager.createQueryBuilder(UserDevice, 'ud')
            .innerJoin('ud.user', 'user')
            .innerJoin(Roster, 'rst', 'rst.userId = user.id')
            .innerJoin('rst.role', 'role')
        if (roleIds) query.andWhere("rst.roleId in (:roleIds)", {roleIds});
        return query.getMany();
    }

    public async updateDeviceId(oldDeviceId: string, newDeviceId: string): Promise<any> {
        return await this.entityManager.createQueryBuilder(UserDevice, 'ud').update()
            .set({deviceId: newDeviceId})
            .where("deviceId = :oldDeviceId", {oldDeviceId})
            .execute();
    }

    private async findDeviceForNewsById(newsId: number): Promise<any[]> {
        return this.entityManager.query(
            'SELECT wl.userId as user_id, wl.deviceId as deviceId\n' +
            'FROM wsa_users.linked_entities le\n' +
            '         inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '         inner join watchlist wl on (le.linkedEntityId = wl.entityId and le.linkedEntityTypeId = wl.entityTypeId)\n' +
            'where ns.id = ?\n' +
            'UNION distinct\n' +
            'select ure.userId as user_id, ud.deviceId as user_device\n' +
            'FROM wsa_users.linked_entities le\n' +
            '         inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '         inner join wsa_users.userRoleEntity ure\n' +
            '                    on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)\n' +
            '         inner join userDevice ud on ure.userId = ud.userId\n' +
            'where ns.id = ?;'
            , [newsId, newsId])
    }

    private async findDeviceForUreAndRoster(newsId: number, ureRoleIds: number[], rosterRoleIds: number[]): Promise<any[]> {
        return this.entityManager.query(
            'select ud.deviceId as deviceId\n' +
            '    FROM wsa_users.linked_entities le\n' +
            '             inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '             inner join wsa_users.userRoleEntity ure\n' +
            '                        on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)\n' +
            '             inner join userDevice ud on ure.userId = ud.userId\n' +
            '    where ns.id = ? and ure.roleId in (?)\n' +
            'union distinct\n' +
            'select ud.deviceId as deviceId\n' +
            '    FROM wsa_users.linked_entities le\n' +
            '                 inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '                 inner join roster rst on (le.linkedEntityId = rst.teamId)\n' +
            '                 inner join userDevice ud on rst.userId = ud.userId\n' +
            '    where le.linkedEntityTypeId = ? and ns.id = ? and rst.roleId in (?);'
            , [newsId, ureRoleIds, EntityType.TEAM, newsId, rosterRoleIds])
    }

    private async findDeviceForNewsByRoleIds(newsId: number, roleIds: number[]): Promise<any[]> {
        return this.entityManager.query(
            'select ure.userId as user_id, ud.deviceId as deviceId\n' +
            'FROM wsa_users.linked_entities le\n' +
            '         inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '         inner join wsa_users.userRoleEntity ure\n' +
            '                    on (le.linkedEntityId = ure.entityId and le.linkedEntityTypeId = ure.entityTypeId)\n' +
            '         inner join userDevice ud on ure.userId = ud.userId\n' +
            'where ns.id = ? and ure.roleId in (?);'
            , [newsId, roleIds])
    }

    private async findDeviceForRoster(newsId: number, ids: number[]): Promise<any[]> {
        return this.entityManager.query(
            'select distinct ud.deviceId as deviceId\n' +
            '    FROM wsa_users.linked_entities le\n' +
            '                 inner join news ns on (ns.entityId = le.inputEntityId and ns.entityTypeId = le.inputEntityTypeId)\n' +
            '                 inner join roster rst on (le.linkedEntityId = rst.teamId)\n' +
            '                 inner join userDevice ud on rst.userId = ud.userId\n' +
            '    where le.linkedEntityTypeId = ? and ns.id = ? and rst.roleId in (?);'
            , [EntityType.TEAM, newsId, ids])
    }

    public async findDeviceForNews(news: News): Promise<any[]> {
        let result = new Set();
        if (news) {
            if (news.toUserIds) {
                let ids = this.parseIds(news.toUserIds);
                if (ids.length > 0) {
                    let data = await this.getUserTokens(ids);
                    result = new Set(data.map(device => device.deviceId));
                }
            } else if (news.toUserRoleIds && news.toRosterRoleIds) {
                let ure = this.parseIds(news.toUserRoleIds);
                let roster = this.parseIds(news.toRosterRoleIds);
                if (ure.length > 0 && roster.length > 0) {
                    let data = await this.findDeviceForUreAndRoster(news.id, ure, roster);
                    result = new Set(data.map(device => device.deviceId));
                } else {
                    if (ure.length > 0) {
                        let data = await this.findDeviceForNewsByRoleIds(news.id, ure);
                        result = new Set(data.map(device => device.deviceId));
                    }
                    if (roster.length > 0) {
                        let data = await this.findDeviceForRoster(news.id, roster);
                        let list = new Set(data.map(device => device.deviceId));
                        for (const token of list) if (!result.has(token)) result.add(token);
                    }
                }
            } else if (news.toUserRoleIds) {
                let ids = this.parseIds(news.toUserRoleIds);
                if (ids.length > 0) {
                    let data = await this.findDeviceForNewsByRoleIds(news.id, ids);
                    result = new Set(data.map(device => device.deviceId));
                }
            } else if (news.toRosterRoleIds) {
                let ids = this.parseIds(news.toRosterRoleIds);
                if (ids.length > 0) {
                    let data = await this.findDeviceForRoster(news.id, ids);
                    result = new Set(data.map(device => device.deviceId));
                }
            } else {
                let data = await this.findDeviceForNewsById(news.id);
                result = new Set(data.map(device => device.deviceId));
            }
        }
        return [...result];
    }

    private parseIds(ids): any[] {
        let array = JSON.parse(ids);
        if (Array.isArray(array) && array.length > 0) {
            return array;
        }
        return [];
    }
}
