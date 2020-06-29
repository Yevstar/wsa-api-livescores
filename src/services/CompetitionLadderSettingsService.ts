import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionLadderSettings } from "../models/CompetitionLadderSettings";
import { Brackets } from "typeorm";
import { isArrayPopulated } from "../utils/Utils";


@Service()
export default class CompetitionLadderSettingsService extends BaseService<CompetitionLadderSettings> {

  modelName(): string {
    return CompetitionLadderSettings.name;
  }

  public async getByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .select()
      .from(CompetitionLadderSettings, 'ladderSetting')
      .where('competitionId = :id', { id })
      .execute();
  }

  public async getLadderSettings(competitiondId: number){
    try {
      var result = await this.entityManager.query("call wsa.usp_get_ladder_settings(?)", 
                      [competitiondId]);

      let responseObj = {
        ladders : [],
        divisions: [],
        defaultLadders: []
      };   

      if(result!= null){
        if(isArrayPopulated(result[0])){
          if(result[0].length == 1){
            for(let item of result[0]){
              if(item.divisions.length == 0){
                item.isAllDivision = 1;
              }
            }
          }
          responseObj.ladders = result[0];
        }
        else{
          result[1][0]["isAllDivision"] = 0;
          result[1][0]["ladderFormatId"] = 0;
          responseObj.ladders = result[1];
        }
         
        responseObj.divisions = result[2];
        responseObj.defaultLadders = result[1];
        
      }
      return responseObj;
    } catch (error) {
      throw error;
    }
  }

  public async deleteByCompetitionId(id?: number) {
    return this.entityManager
      .createQueryBuilder()
      .delete()
      .from(CompetitionLadderSettings, 'ladderSetting')
      .where('competitionId = :id', { id })
      .execute();
  }

}