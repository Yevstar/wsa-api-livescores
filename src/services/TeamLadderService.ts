import {Service} from "typedi";
import BaseService from "./BaseService";
import {TeamLadder} from "../models/TeamLadder";
import { Match } from "../models/Match";

@Service()
export default class TeamLadderService extends BaseService<TeamLadder> {

    modelName(): string {
        return TeamLadder.name;
    }

    public async getTeamLadderByMatch(match: Match, competitionLadderSettings: any, userId): Promise<TeamLadder[]>{
        let teamLadderArr = [];
        try {
            let team1Arr = [];
            let team2Arr = [];
            let resultStatus = null;
            console.log("Match Result Status ::" + match.resultStatus);
            if(match.resultStatus!= null && match.resultStatus!= undefined){
                resultStatus = match.resultStatus.toString().toLowerCase();
            }
           
           // if(resultStatus != "dispute" && resultStatus!= "unconfirmed"){
                if(match.team1Id!= 1)
                    team1Arr = this.teamLadderRow(match, 1, competitionLadderSettings, resultStatus);
            
                if(match.team2Id!= 1)
                    team2Arr = this.teamLadderRow(match, 2, competitionLadderSettings, resultStatus);

                teamLadderArr = [...team1Arr, ...team2Arr];
           // }

            if(resultStatus == "dispute" || resultStatus == "unconfirmed"){
                await this.deleteExistingPoints(match, userId);
            }
            else{
                await this.deleteExistingData(match, userId);
            }
           
        } catch (error) {
            throw error;
        }

        return teamLadderArr;
    }

    private teamLadderRow(match: Match, team1Or2, competitionLadderSettings, resultStatus){
        let arr = [];
        try {
            let pointsVal = 0;
            let typeRefId = 0;
            let compSetting = null;
            let teamId = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;
            let gamesPlayedMinusFW = 1;
            let gamesPlayed = 1;
            let isOpponentBye = false;

            if(team1Or2 == 1){
                teamId = match.team1Id;
                if(match.team2Id == 1){
                    isOpponentBye = true;
                    typeRefId = 7;
                }else{
                    typeRefId = match.team1ResultId;
                }
                goalsFor = match.team1Score;
                goalsAgainst = match.team2Score;
            }
            else{
                teamId = match.team2Id;
                if(match.team1Id == 1){
                    isOpponentBye = true;
                    typeRefId = 7;
                }else{
                    typeRefId = match.team2ResultId;
                }
               
                goalsFor = match.team2Score;
                goalsAgainst = match.team1Score;
            }
            compSetting = competitionLadderSettings.find(x=>x.resultTypeId == typeRefId);
            if(compSetting!= null){
                pointsVal = compSetting.points;
            }

            if(typeRefId == 4){
                gamesPlayedMinusFW = 0
            }

            if(resultStatus != "dispute" && resultStatus!= "unconfirmed"){
                arr.push(this.teamLadderObject(match, teamId, typeRefId,pointsVal));
            }
            if(!isOpponentBye){
                arr.push(this.teamLadderObject(match, teamId, 21, goalsFor));
                arr.push(this.teamLadderObject(match, teamId, 22, goalsAgainst));
                arr.push(this.teamLadderObject(match, teamId, 23, gamesPlayed)); 
                arr.push(this.teamLadderObject(match, teamId, 24, gamesPlayedMinusFW));
            }

           
        } catch (error) {
           throw error; 
        }

        return arr;
    }

    private teamLadderObject(match : Match, teamId, typeRefId, typeVal){
        let  teamLadder = new TeamLadder();
        teamLadder.id = 0;
        teamLadder.competitionId = match.competitionId;
        teamLadder.divisionId = match.divisionId;
        teamLadder.matchId = match.id;
        teamLadder.teamId = teamId;
        teamLadder.teamLadderTypeRefId = typeRefId;
        teamLadder.teamLadderTypeValue = typeVal;

        return teamLadder;
    }

    private async deleteExistingData(match: Match, userId){
        try {
            await this.entityManager.createQueryBuilder(TeamLadder, 'teamLadder')
                .update(TeamLadder)
                .set({deleted_at: new Date(), updatedBy: userId, updated_at: new Date()})
                .andWhere("teamLadder.matchId = :matchId",{matchId: match.id})
                .execute()
        } catch (error) {
            throw error;
        }
    }

    private async deleteExistingPoints(match: Match, userId){
        try {
            await this.entityManager.createQueryBuilder(TeamLadder, 'teamLadder')
                .update(TeamLadder)
                .set({teamLadderTypeValue: 0, updatedBy: userId, updated_at: new Date()})
                .andWhere("teamLadder.matchId = :matchId and teamLadder.teamLadderTypeRefId <= 9",{matchId: match.id})
                .execute();

            await this.entityManager.createQueryBuilder(TeamLadder, 'teamLadder')
            .update(TeamLadder)
            .set({deleted_at: new Date(), updatedBy: userId, updated_at: new Date()})
            .andWhere("teamLadder.matchId = :matchId and teamLadder.teamLadderTypeRefId >= 21 ",{matchId: match.id})
            .execute()
        } catch (error) {
            throw error;
        }
    }

    public async clearLadderPoints(competitionId, divisionId, userId){
        try {
            if(divisionId!= null){
                await this.entityManager.createQueryBuilder(TeamLadder, 'teamLadder')
                .update(TeamLadder)
                .set({teamLadderTypeValue: 0, updatedBy: userId, updated_at: new Date()})
                .andWhere("teamLadder.competitionId = :competitionId and  teamLadder.divisionId = :divisionId",
                            {competitionId: competitionId, divisionId: divisionId})
                .execute();
            }
            else{
                await this.entityManager.createQueryBuilder(TeamLadder, 'teamLadder')
                .update(TeamLadder)
                .set({teamLadderTypeValue: 0, updatedBy: userId, updated_at: new Date()})
                .andWhere("teamLadder.competitionId = :competitionId",
                            {competitionId: competitionId})
                .execute();
            }
        } catch (error) {
            throw error;
        }
    }

    public async findExistingTeamLadderAdj(competitionId: number, divisionId: number): Promise<TeamLadder[]>{
        try{
            let result = await this.entityManager.createQueryBuilder(TeamLadder, 'tl')
                         .where('tl.competitionId = :competitionId and tl.divisionId = :divisionId and tl.teamLadderTypeRefId = 25 and tl.deleted_at is null',
                         {competitionId: competitionId, divisionId: divisionId})
                         .getMany()
            
            return result;
        }
        catch(error){
            throw error;
        }
    }

    public async getTeamLadderAdjustments(competitionId: number, divisionId: number): Promise<TeamLadder[]>{
        try{
            let result = await this.entityManager.query(
                `Select tl.id as teamLadderId, tl.teamId, tl.teamLadderTypeValue as points, tl.adjustmentReason
                 from wsa.teamLadder tl 
                 where tl.competitionId = ? and tl.divisionId = ?
                 and tl.teamLadderTypeRefId = 25 and tl.deleted_at is null `,[competitionId, divisionId]);
            
            return result;
        }
        catch(error){
            throw error;
        }
    }
}
