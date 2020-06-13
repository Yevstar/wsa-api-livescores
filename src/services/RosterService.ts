import {Service} from "typedi";
import BaseService from "./BaseService";
import {Roster} from "../models/security/Roster";
import {Role} from "../models/security/Role";
import {User} from "../models/User";
import {Match} from "../models/Match";
import {Organisation} from "../models/Organisation";
import {paginationData, stringTONumber, isNotNullAndUndefined} from "../utils/Utils";
import {RequestFilter} from "../models/RequestFilter";

@Service()
export default class RosterService extends BaseService<Roster> {

    modelName(): string {
        return Roster.name;
    }

    public async findFullById(rosterId: number): Promise<Roster> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .leftJoinAndSelect('roster.match', 'match')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2')
            .leftJoinAndSelect('match.venueCourt', 'venueCourt')
            .leftJoinAndSelect('match.division', 'division')
            .leftJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .leftJoinAndSelect('roster.eventOccurrence', 'eo')
            .leftJoinAndSelect('eo.event', 'e')
            .andWhere('roster.id = :rosterId', {rosterId})
            .andWhere('match.deleted_at is null')
            .getOne();
    }

    public async findByUser(userId: number): Promise<Roster[]> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .innerJoinAndSelect('match.team1', 'team1')
            .innerJoinAndSelect('match.team2', 'team2')
            .innerJoinAndSelect('match.venueCourt', 'venueCourt')
            .innerJoinAndSelect('match.division', 'division')
            .innerJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .andWhere('roster.userId = :userId', {userId})
            .andWhere('(match.matchStatus is null or match.matchStatus != :status)', {status: 'ENDED'})
            .andWhere('match.deleted_at is null')
            .getMany();
    }

    public async findRosterEventByUser(userId: number): Promise<Roster[]> {
      return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.eventOccurrence', 'eo')
            .innerJoinAndSelect('eo.event', 'e')
            .andWhere('eo.deleted_at is null')
            .andWhere('roster.userId = :userId', {userId})
            .getMany();
    }

    public async findByMatchIds(matchId: number[]): Promise<Roster[]> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .innerJoinAndSelect('match.team1', 'team1')
            .innerJoinAndSelect('match.team2', 'team2')
            .innerJoinAndSelect('match.venueCourt', 'venueCourt')
            .innerJoinAndSelect('match.division', 'division')
            .innerJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .andWhere('roster.matchId in (:matchId)', {matchId})
            .andWhere('match.deleted_at is null')
            .getMany();
    }

    // keeping the query as light as possible but more fields can be added if needed - used for umpire roster list
    public async findUserRostersByCompetition(competitionId: number, roleId: number, requestFilter: RequestFilter): Promise<[number, Roster[]]> {
        
        let query = this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .innerJoinAndSelect('roster.user', 'user')
            .innerJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('user.userRoleEntities', 'userRoleEntity')
            .leftJoin('userRoleEntity.organisation', 'organisation')
            .addSelect('organisation.name')
            .andWhere('match.competitionId = :competitionId', {competitionId})
            .andWhere('roster.roleId = :roleId', {roleId})
            .andWhere('match.deleted_at is null')
            .andWhere('userRoleEntity.entityTypeId = 2')
            .andWhere('userRoleEntity.roleId = 15');

            if (isNotNullAndUndefined(requestFilter) 
                && isNotNullAndUndefined(requestFilter.paging)
                && isNotNullAndUndefined(requestFilter.paging.limit) 
                && isNotNullAndUndefined(requestFilter.paging.offset)) {
                const count = await query.getCount();
                const result = await query.skip(requestFilter.paging.offset).take(requestFilter.paging.limit).getMany();
                return [count, result];
            } else {
                const count = null;
                const result = await query.getMany();
                return [count, result];
            }
    }
    
    public async findRosterId(rosterId: number): Promise<Roster> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .leftJoinAndSelect('match.matchPausedTimes', 'matchPausedTimes')
            .andWhere('roster.id = :rosterId', {rosterId})
            .andWhere('match.deleted_at is null')
            .getOne();
    }

    // to allow inline edit of rosters
    public async findAdminRosterId(rosterId: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Roster, 'r')
            .select(['distinct u.id as id', 'u.firstName as firstName', 'u.lastName as lastName',
                'r.id as rosterId', 'r.status as rosterStatus'])
            .innerJoin(User, 'u', '(u.id = r.userId)')
            .andWhere("r.id = :rosterId", {rosterId});
        return query.getRawOne();
    }

    // to allow inline edit of rosters
    public async findByParam(rosterId: number): Promise<any> {
        let query = this.entityManager.createQueryBuilder(Roster, 'r')
            .select(['distinct u.id as id', 'u.firstName as firstName', 'u.lastName as lastName',
                'r.id as rosterId', 'r.status as rosterStatus'])
            .innerJoin(User, 'u', '(u.id = r.userId)')
            .andWhere("r.id = :rosterId", {rosterId});
        return query.getRawOne();
    }

    public async findUsersByRole(competitionId: number, roleId: number): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
            .select(['distinct u.id as id', 'u.email as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.photoUrl as photoUrl'])
            .innerJoin(Roster, 'r', '(u.id = r.userId)')
            .innerJoin(Match, 'm', '(m.id = r.matchId)')
            .andWhere("m.competitionId = :competitionId", {competitionId})
            .andWhere("r.roleId = :roleId", {roleId});
        return query.getRawMany();
    }

    public async findByCompetitionId(competitionid: number, roleId: number, requestFilter: RequestFilter): Promise<any> {
        let result = await this.entityManager.query("call wsa.usp_get_team_rosters(?,?,?,?,?)",
            [competitionid, roleId, requestFilter.paging.limit, requestFilter.paging.offset, requestFilter.search]);
        if (result != null) {
            let totalCount = (result[1] && result[1].find(x=>x)) ? result[1].find(x=>x).totalCount : 0;
            let responseObject = paginationData(stringTONumber(totalCount), requestFilter.paging.limit, requestFilter.paging.offset);
            responseObject["users"] = result[0];
            return responseObject;
        } else {
            return [];
        }
    }

    public async findByEventOccurrence(eventOccurrenceId: number): Promise<Roster[]> {
      return this.entityManager.createQueryBuilder(Roster, 'r')
              .andWhere("r.eventOccurrenceId = :id", {id: eventOccurrenceId})
              .getMany();
    }

    public async findByParams(roleId: number, userId: number, matchId: number): Promise<Roster> {
      return this.entityManager.createQueryBuilder(Roster, 'r')
              .andWhere("r.roleId = :roleId", {roleId})
              .andWhere("r.userId = :userId", {userId})
              .andWhere("r.matchId = :matchId", {matchId})
              .getOne();
    }

    public async getRosterStatus(roleId: number, teamId: number, matchId: number): Promise<Roster> {
        return await this.entityManager.createQueryBuilder(Roster, 'r')
                .andWhere("r.roleId = :roleId", {roleId})
                .andWhere("r.teamId = :teamId", {teamId})
                .andWhere("r.matchId = :matchId", {matchId})
                .execute();
    }
}
