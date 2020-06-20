import {Service} from "typedi";
import BaseService from "./BaseService";
import {Lineup} from "../models/Lineup";
import {DeleteResult} from "typeorm-plus";

@Service()
export default class LineupService extends BaseService<Lineup> {

    modelName(): string {
        return Lineup.name;
    }
}
