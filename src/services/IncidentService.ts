import {Service} from "typedi";
import BaseService from "./BaseService";
import {Incident} from "../models/Incident";
import {IncidentType} from "../models/IncidentType";
import {IncidentMedia} from "../models/IncidentMedia";
import {IncidentPlayer} from "../models/IncidentPlayer";
import { isNotNullAndUndefined } from "../utils/Utils";
import { EntityType } from "../models/security/EntityType";

@Service()
export default class IncidentService extends BaseService<Incident> {
    modelName(): string {
        return Incident.name;
    }

    public async findByParams(
        incidentId: number,
        entityId: number,
        entityTypeId: number,
        offset: number,
        limit: number,
        search: string,
        sortBy:string = undefined,
        sortOrder:"ASC"|"DESC" = undefined
    ): Promise<any> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .innerJoinAndSelect('incident.incidentType', 'incidentType')
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('incident.competition', 'competition')
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('player.team', 'team')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .leftJoinAndSelect('match.team1', 'team1')
            .leftJoinAndSelect('match.team2', 'team2');

        query.andWhere("incident.deleted_at is null");

        if (incidentId) {
            query.andWhere("incident.id = :incidentId", { incidentId });
        }

        if (isNotNullAndUndefined(entityTypeId) && isNotNullAndUndefined(entityId)) {
            if (entityTypeId == EntityType.COMPETITION) {
                query.andWhere("incident.competitionId = :entityId", {entityId});
            } else if (entityTypeId == EntityType.COMPETITION_ORGANISATION) {
                query.andWhere("team.competitionOrganisationId = :entityId", {entityId});
            }
        }

        if (isNotNullAndUndefined(search) && search !== '') {
            query.andWhere('(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :search)',
            { search: `%${search.toLowerCase()}%` });
        }

        if (sortBy) {
            if (sortBy === 'date') {
                query.orderBy('incident.createdAt', sortOrder);
            } else if (sortBy === 'matchId') {
                query.orderBy('incident.matchId', sortOrder);
            } else if (sortBy === 'firstName') {
                query.orderBy('player.firstName', sortOrder);
            } else if (sortBy === 'lastName') {
                query.orderBy('player.lastName', sortOrder);
            } else if (sortBy === 'type') {
                query.orderBy('incidentType.name', sortOrder);
            }
        }

        if (isNotNullAndUndefined(limit) && isNotNullAndUndefined(offset)) {
            const count = await query.getCount()
            const results = await query.skip(offset).take(limit).getMany();
            return { count, results }
        } else {
            const count = null;
            const results = await query.getMany();
            return { count, results }
        }
    }

    public async findIncidents(competitionId: number): Promise<Incident[]> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .andWhere('competitionId = :competitionId', {competitionId});

        return query.getMany();
    }

    public async getIncidentsForDashBoard(
        competitionId: number,
        competitionOrganisationId: number,
        from: Date,
        to: Date
    ): Promise<any> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('match.team1', 'team1')
            .innerJoinAndSelect('match.team2', 'team2')
            .innerJoinAndSelect('incident.incidentType', 'incidentType')
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('player.team', 'team')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .leftJoinAndSelect('team.linkedCompetitionOrganisation', 'linkedCompetitionOrganisation');
        if (competitionId) query.andWhere("incident.competitionId = :competitionId", { competitionId });
        if (isNotNullAndUndefined(competitionOrganisationId)) {
            query.andWhere("(team1.competitionOrganisationId = :compOrgId or " +
                "team2.competitionOrganisationId = :compOrgId)", {compOrgId: competitionOrganisationId});
        }
        if (from) query.andWhere("incident.createdAt >= :from", { from });
        if (to) query.andWhere("incident.createdAt <= :to", { to });
        query.orderBy("incident.createdAt", "DESC");
        return query.getMany();
    }

    public async loadIncidentTypes() {
        return this.entityManager.createQueryBuilder(IncidentType, 'it').getMany();
    }

    public async batchSavePlayersIncident(incidents: IncidentPlayer[]) {
        return this.entityManager.save(IncidentPlayer.name, incidents);
    }

    public async findIncidentsByParam(matchId: number, competitionId: number, teamId: number, playerId: number,
                                      incidentTypeId: number): Promise<Incident[]> {
        let query = this.entityManager.createQueryBuilder(Incident, 'i')
            .innerJoin(IncidentPlayer, 'pi', 'pi.incidentId = i.id')
            .andWhere('i.teamId = :teamId', {teamId})
            .andWhere('i.deleted_at is null')
            .andWhere('pi.playerId = :playerId', {playerId});

        if (competitionId) query.andWhere("i.competitionId = :competitionId", {competitionId});
        if (matchId) query.andWhere("i.matchId = :matchId", {matchId});
        if (incidentTypeId) query.andWhere("i.incidentTypeId = :incidentTypeId", {incidentTypeId});
        return query.getMany()
    }

    public async saveIncidentMedia(media: IncidentMedia[]) {
        return this.entityManager.save(media);
    }

    public createIncidentMedia(id: number, guid: string, userId: number, url: string, type: string): IncidentMedia {
        let media = new IncidentMedia();
        media.incidentId = id;
        media.guid = guid;
        media.mediaUrl = url;
        media.mediaType = type;
        media.userId = userId;
        return media;
    }

    public async deleteIncidentPlayers(id: number) {
      return this.entityManager
          .createQueryBuilder()
          .delete()
          .from(IncidentPlayer, 'ip')
          .where('incidentId = :id', { id })
          .execute();
    }

    public async mediaCount(id: number, guid: string): Promise<number> {
        let query = this.entityManager.createQueryBuilder(IncidentMedia, 'im');
        if (id) {
            query.where("incidentId = :id", {id: id});
        }
        if (guid) {
          query.where("guid = :guid", {guid: guid});
        }
        return query.getCount();
    }

    public async fetchIncidentMedia(id: number, guid: string): Promise<IncidentMedia[]> {
        let query = this.entityManager.createQueryBuilder(IncidentMedia, 'im');
        if (id) {
            query.where("incidentId = :id", {id: id});
        }
        if (guid) {
          query.where("guid = :guid", {guid: guid});
        }
        return query.getMany();
    }

    public async removeIncidentMedia(incidentMedia: IncidentMedia) {
        return this.entityManager
            .createQueryBuilder()
            .delete()
            .from(IncidentMedia, 'im')
            .where('id = :id', { id: incidentMedia.id })
            .execute();
    }

    public async batchSaveIncidentMedia(incidentMedias: IncidentMedia[]) {
        return this.entityManager.save(IncidentMedia.name, incidentMedias);
    }

    public async fetchIncidentByGUID(guid: string): Promise<Incident> {
      let query = this.entityManager
          .createQueryBuilder(Incident, "incident")
          .andWhere('guid = :guid', { guid })
          .andWhere('deleted_at is null');

      return query.getOne();
    }
}
