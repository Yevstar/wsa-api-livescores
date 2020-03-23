import {Service} from "typedi";
import BaseService from "./BaseService";
import {Incident} from "../models/Incident";
import {IncidentType} from "../models/IncidentType";
import {IncidentMedia} from "../models/IncidentMedia";
import {IncidentPlayer} from "../models/IncidentPlayer";
import {Match} from "../models/Match";


@Service()
export default class IncidentService extends BaseService<Incident> {
    modelName(): string {
        return Incident.name;
    }

    public async findByParams(
        incidentId: number,
        competitionId: number
    ): Promise<Incident[]> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('incident.incidentType', 'incidentType');
            
        if (incidentId) query.andWhere("incident.id = :incidentId", {incidentId});
        if (competitionId) query.andWhere("incident.competitionId = :competitionId", {competitionId});
        return query.getMany();
    }

    public async findIncidents(competitionId: number): Promise<Incident[]> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
        return query.getMany();
    }

    public async getIncidentsForDashBoard(competitionId: number, from: Date, to: Date): Promise<any> {
        let query = this.entityManager
            .createQueryBuilder(Incident, "incident")
            .leftJoinAndSelect('incident.incidentPlayers', 'incidentPlayer')
            .leftJoinAndSelect('incidentPlayer.player', 'player')
            .leftJoinAndSelect('incident.incidentMediaList', 'incidentMedia')
            .innerJoinAndSelect('incident.match', 'match')
            .innerJoinAndSelect('incident.incidentType', 'incidentType');
        if (competitionId) query.andWhere("incident.competitionId = :competitionId", { competitionId });
        if (from) query.andWhere("incident.createdAt >= :from", { from });
        if (to) query.andWhere("incident.createdAt <= :to", { to });
        query.orderBy("incident.createdAt", "DESC");
        return query.getMany();
    }
}
