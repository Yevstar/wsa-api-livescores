import {Get, Param, Delete, JsonController, QueryParam, Post, Body, Res, Authorized, UploadedFile} from 'routing-controllers';
import {Division} from "../models/Division";
import {BaseController} from "./BaseController";
import {stringTONumber, paginationData, isNotNullAndUndefined} from "../utils/Utils";
import {Response} from "express";

@JsonController('/division')
export class DivisionController extends BaseController {

    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.divisionService.findById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(
        @Param("id") id: number )
    {
            return this.divisionService.deleteById(id);
    }

    @Get('/')
    async find(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('clubIds') clubIds: number[],
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('competitionKey') competitionUniqueKey: string,
        @QueryParam('search') search: string,
    ): Promise<any> {

        if(search===null || search === undefined) search = '';
        if (isNotNullAndUndefined(competitionUniqueKey)) {
            const getCompetitions = await this.competitionService.getCompetitionByUniquekey(competitionUniqueKey);
            competitionId = getCompetitions.id;
        }

        if (clubIds && !Array.isArray(clubIds)) clubIds = [clubIds];
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        if (competitionId || teamIds && teamIds.length > 0 || clubIds && clubIds.length > 0) {
            const resultsFound = await this.divisionService.findByParams(competitionId, clubIds, teamIds, offset, limit, search);
            if (resultsFound && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
                let responseObject = paginationData(stringTONumber(resultsFound.countObj), limit, offset)
                responseObject["divisions"] = resultsFound.result;
                return responseObject;
            } else {
                return resultsFound.result;
            }
        } else {
            return []
        }


    }

    @Authorized()
    @Post('/')
    async addDivision(
        @Body() division: Division,
    ) {
        let data = await this.divisionService.createOrUpdate(division)
        return data;
    }

    @Authorized()
    @Get('/find')
    async findByName(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('name') name: string
    ): Promise<any> {
        let data = await this.divisionService.findByName(name, competitionId)
        return data;
    }

    @Authorized()
    @Post('/import')
    async importDivision(
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Res() response: Response
    ) {
        let bufferString = file.buffer.toString('utf8');
        let arr = bufferString.split('\n');
        var jsonObj = [];
        var headers = arr[0].split(',');
        for (var i = 1; i < arr.length; i++) {
            var data = arr[i].split(',');
            var obj = {};
            for (var j = 0; j < data.length; j++) {
                obj[headers[j].trim()] = data[j].trim();
            }
            jsonObj.push(obj);
        }
        JSON.stringify(jsonObj);
        let queryArr = [];
        for (let i of jsonObj) {
            if (i.name != "") {
                let divisionObj = new Division();
                divisionObj.name = i.name;
                divisionObj.divisionName = i.division;
                divisionObj.grade = i.grade;
                divisionObj.competitionId = competitionId;
                queryArr.push(divisionObj)
            }
        }
        await this.divisionService.batchCreateOrUpdate(queryArr);
        return response.status(200).send({updated: true});
    }

}
 