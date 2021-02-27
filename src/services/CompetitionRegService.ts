import { Service } from "typedi";
import { logger } from "../logger";
import BaseService from "./BaseService";
import { isArrayPopulated } from "../utils/Utils";
import { CompetitionReg } from "../models/CompetitionReg";

@Service()
export default class CompetitionRegService extends BaseService<CompetitionReg> {

    modelName(): string {
        return CompetitionReg.name;
    }
}