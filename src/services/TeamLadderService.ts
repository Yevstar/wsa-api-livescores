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
           
            if(resultStatus != "dispute" && resultStatus!= "unconfirmed"){
                if(match.team1Id!= 1)
                    team1Arr = this.teamLadderRow(match, 1, competitionLadderSettings);
            
                if(match.team2Id!= 1)
                    team2Arr = this.teamLadderRow(match, 2, competitionLadderSettings);

                teamLadderArr = [...team1Arr, ...team2Arr];
            }
           
            await this.deleteExistingData(match, userId);
        } catch (error) {
            throw error;
        }

        return teamLadderArr;
    }

    private teamLadderRow(match: Match, team1Or2, competitionLadderSettings){
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

            arr.push(this.teamLadderObject(match, teamId, typeRefId,pointsVal));
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

}
