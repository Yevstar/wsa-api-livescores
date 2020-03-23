import {Get, JsonController, QueryParam} from 'routing-controllers';
import {MatchResultType} from "../models/MatchResultType";
import {GamePosition} from "../models/GamePosition";
import {BaseController} from "./BaseController";
import {GameStat} from '../models/GameStat';
import { HOUR } from "../cache";
import {IncidentType} from "../models/IncidentType";

@JsonController('/ref')
export class ReferenceController extends BaseController {

    @Get('/matchResult')
    async getMatchResults(): Promise<MatchResultType[]> {
        return this.cacheReferences('matchResult', this.matchService.getMatchResultTypes(), HOUR);
    }

    @Get('/gamePositions')
    async getGamePositions(): Promise<GamePosition[]> {
        return this.cacheReferences('gamePositions', this.matchService.loadGamePositions(), HOUR);
    }

    @Get('/gameStats')
    async getGameStats(): Promise<GameStat[]> {
        return this.cacheReferences('gameStats', this.matchService.loadGameStats(), HOUR);
    }

    @Get('/incidentTypes')
    async getIncidentTypes(): Promise<IncidentType[]> {
        return this.cacheReferences('incidentTypes', this.matchService.loadIncidentTypes(), HOUR);
    }

    private async cacheReferences(key, action, ttl = undefined) {
        // let result = fromCacheAsync(key);
        // if (!result) {
            let data = await action;
            // if (data) {
            //     toCacheWithTtl(key, JSON.stringify(data), ttl);
                return data;
            // }
        // } else {
        //     result = JSON.parse(result);
        // }
        // return result;
    }
}
