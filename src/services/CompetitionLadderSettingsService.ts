import { Service } from "typedi";
import BaseService from "./BaseService";
import { CompetitionLadderSettings } from "../models/CompetitionLadderSettings";
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

        if(isArrayPopulated(result[2])){
          result[2].map((i) => {
            i.isDisabled = 0;
          });
        }

        if(isArrayPopulated(result[0])){
         // console.log("***********" + JSON.stringify( result[0]));
          if(result[0].length == 1 && result[0][0].isAllDivision == 1){
            
            for(let item of result[0]){
              let arr = [];
              if(isArrayPopulated(result[2])){
                for(let div of result[2]){
                  arr.push(div.divisionId)
                }
                item.selectedDivisions.push(...arr);
              }

              
            }
          }

          for(let item of result[0]){
            item["divisions"] = result[2];
            item.settings.sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : ((b.sortOrder > a.sortOrder) ? -1 : 0));
          }
          responseObj.ladders = result[0];

          result[1][0]["isAllDivision"] = 0;
          result[1][0]["ladderFormatId"] = 0;
          result[1][0]["divisions"] =  result[2];
        }
        // else{
        //   result[1][0]["isAllDivision"] = 0;
        //   result[1][0]["ladderFormatId"] = 0;
        //   result[1][0]["divisions"] =  result[2];
        //   responseObj.ladders = result[1];
        // }
        for(let item of result[1]){
          item.settings.sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : ((b.sortOrder > a.sortOrder) ? -1 : 0));
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

  public async deleteByLadderFormatId(id?: number) {
    return await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(CompetitionLadderSettings, 'ladderSetting')
      .where('ladderFormatId = :id', { id })
      .execute();
  }

  public async getByCompetitionDivisionId(competitionId: number, divisionId: number): Promise<CompetitionLadderSettings[]>{
    try {
        let response = await this.entityManager.query(`
        select cls.* from wsa.competition_ladder_settings cls 
        inner join wsa.ladderFormat lf 
          on lf.id = cls.ladderFormatId and lf.competitionId = cls.competitionId and lf.deleted_at is NULL 
        left join wsa.ladderFormatDivision lfd 
          on lfd.ladderFormatId = lf.id and lfd.deleted_at is null
        where lf.competitionId = ?  and (lfd.divisionId is null or lfd.divisionId = ?)`,
          [competitionId, divisionId]);

        return response;
    } catch (error) {
      throw error;
    }
  }

}