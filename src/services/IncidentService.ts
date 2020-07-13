import {Service} from "typedi";
import BaseService from "./BaseService";
import {Incident} from "../models/Incident";
import {IncidentType} from "../models/IncidentType";
import {IncidentMedia} from "../models/IncidentMedia";
import {IncidentPlayer} from "../models/IncidentPlayer";
import { isNotNullAndUndefined } from "../utils/Utils";

@Service()
export default class IncidentService extends BaseService<Incident> {
    modelName(): string {
        return Incident.name;
    }

    public async findByParams(
        incidentId: number,
        competitionId: number,
        offset: number, limit: number, search: string
    ): Promise<{ count: number, result: Incident[] }> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('incident.incidentType', 'incidentType');

        if (incidentId) query.andWhere("incident.id = :incidentId", {incidentId});
        if (competitionId) query.andWhere("incident.competitionId = :competitionId", {competitionId});

        if (isNotNullAndUndefined(search) && search !== '') {
            query.andWhere('(LOWER(concat_ws(" ", player.firstName, player.lastName)) like :search)',
            { search: `%${search.toLowerCase()}%` });
        }

        if (isNotNullAndUndefined(limit) && isNotNullAndUndefined(offset)) {
            const count = await query.getCount()
            const result = await query.skip(offset).take(limit).getMany();
            return { count, result }
        } else {
            const count = null;
            const result = await query.getMany();
            return { count, result }
        }
    }

    public async findIncidents(competitionId: number): Promise<Incident[]> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .andWhere('competitionId = :competitionId', {competitionId});

        return query.getMany();
    }

    public async getIncidentsForDashBoard(competitionId: number, from: Date, to: Date): Promise<any> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('player.team', 'team')
            .innerJoinAndSelect('team.organisation', 'organisation')
            .innerJoinAndSelect('incident.incidentType', 'incidentType');
        if (competitionId) query.andWhere("incident.competitionId = :competitionId", { competitionId });
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
          .andWhere('guid = :guid', {guid});

      return query.getOne();
    }
}
