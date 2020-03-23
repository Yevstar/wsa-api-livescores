import {Service} from "typedi";
import BaseService from "./BaseService";
import {Roster} from "../models/security/Roster";
import {User} from "../models/User";
import {Match} from "../models/Match";
import {paginationData, stringTONumber } from "../utils/Utils";
import {RequestFilter} from "../models/RequestFilter";

@Service()
export default class RosterService extends BaseService<Roster> {

    modelName(): string {
        return Roster.name;
    }

    public async findFullById(rosterId: number): Promise<Roster> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .innerJoinAndSelect('match.team1', 'team1')
            .innerJoinAndSelect('match.team2', 'team2')
            .innerJoinAndSelect('match.venueCourt', 'venueCourt')
            .innerJoinAndSelect('match.division', 'division')
            .innerJoinAndSelect('match.competition', 'competition')
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
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
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .andWhere('roster.userId = :userId', {userId})
            .andWhere('(match.matchStatus is null or match.matchStatus != :status)', {status: 'ENDED'})
            .andWhere('match.deleted_at is null')
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
            .leftJoinAndSelect('competition.location', 'location')
            .leftJoinAndSelect('venueCourt.venue', 'venue')
            .andWhere('roster.matchId in (:matchId)', {matchId})
            .andWhere('match.deleted_at is null')
            .getMany();
    }

    public async findRosterId(rosterId: number): Promise<Roster> {
        return this.entityManager.createQueryBuilder(Roster, 'roster')
            .innerJoinAndSelect('roster.match', 'match')
            .andWhere('roster.id = :rosterId', {rosterId})
            .andWhere('match.deleted_at is null')
            .getOne();
    }

    public async findByRole(competitionId: number, roleId: number): Promise<User[]> {
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

}
