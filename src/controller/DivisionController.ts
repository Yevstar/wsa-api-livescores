import {Response} from "express";
import {
    Get,
    Param,
    Delete,
    JsonController,
    QueryParam,
    Post,
    Body,
    Res,
    Authorized,
    UploadedFile
} from "routing-controllers";

import {Division} from "../models/Division";
import {stringTONumber, paginationData, isNotNullAndUndefined, validationForField, arrangeCSVToJson} from "../utils/Utils";
import {BaseController} from "./BaseController";

@JsonController('/division')
export class DivisionController extends BaseController {
    @Authorized()
    @Get('/id/:id')
    async get(@Param("id") id: number) {
        return this.divisionService.findById(id);
    }

    @Authorized()
    @Delete('/id/:id')
    async delete(@Param("id") id: number) {
        return this.divisionService.deleteById(id);
    }

    @Get('/')
    async find(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('teamIds') teamIds: number[] = [],
        @QueryParam('organisationIds') organisationIds: number[],
        @QueryParam('offset') offset: number,
        @QueryParam('limit') limit: number,
        @QueryParam('competitionKey') competitionUniqueKey: string,
        @QueryParam('search') search: string,
        @QueryParam('sortBy') sortBy?: string,
        @QueryParam('sortOrder') sortOrder?: "ASC" | "DESC"
    ): Promise<any> {
        if (search === null || search === undefined) search = '';
        if (isNotNullAndUndefined(competitionUniqueKey)) {
            const getCompetitions = await this.competitionService.getCompetitionByUniquekey(competitionUniqueKey);
            competitionId = getCompetitions.id;
        }

        if (organisationIds && !Array.isArray(organisationIds)) organisationIds = [organisationIds];
        if (teamIds && !Array.isArray(teamIds)) teamIds = [teamIds];
        if (competitionId || teamIds && teamIds.length > 0 || organisationIds && organisationIds.length > 0) {
            const resultsFound = await this.divisionService.findByParams(competitionId, organisationIds, teamIds, offset, limit, search, sortBy, sortOrder);
            if (resultsFound && isNotNullAndUndefined(offset) && isNotNullAndUndefined(limit)) {
                let responseObject = paginationData(stringTONumber(resultsFound.countObj), limit, offset)
                responseObject["divisions"] = resultsFound.result;
                return responseObject;
            } else {
                return resultsFound.result;
            }
        }

        return [];
    }

    @Authorized()
    @Post('/')
    async addDivision(@Body() division: Division) {
        return await this.divisionService.createOrUpdate(division)
    }

    @Authorized()
    @Get('/find')
    async findByName(
        @QueryParam('competitionId') competitionId: number,
        @QueryParam('name') name: string
    ): Promise<any> {
        return await this.divisionService.findByName(name, competitionId)
    }

    @Authorized()
    @Post('/import')
    async importDivision(
        @UploadedFile("file", { required: true }) file: Express.Multer.File,
        @QueryParam('competitionId', { required: true }) competitionId: number,
        @Res() response: Response
    ) {
        const requiredField = [
            'name'
        ];

        const bufferString = file.buffer.toString('utf8');
        const data = arrangeCSVToJson(bufferString);

        let queryArr = [];
        const { result: importArr, message } = validationForField({
            filedList: requiredField,
            values: data,
        });

        for (let i of importArr) {
            if (i.name != "") {
                let divisionObj = new Division();
                divisionObj.name = i.Name;
                divisionObj.divisionName = i.Division;
                divisionObj.grade = i.Grade;
                divisionObj.competitionId = competitionId;
                queryArr.push(divisionObj);
            }
        }

        const totalCount = data.length;
        const successCount = queryArr.length;
        const failedCount = data.length - queryArr.length;
        const resMsg = `${totalCount} lines processed. ${successCount} lines successfully imported and ${failedCount} lines failed.`;

        await this.divisionService.batchCreateOrUpdate(queryArr);
        return response.status(200).send({
            data: importArr,
            error: message,
            message: resMsg,
            rawData: data,
        });
    }
}
