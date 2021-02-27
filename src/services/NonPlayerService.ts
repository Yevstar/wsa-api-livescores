import { Service } from "typedi";
import BaseService from "./BaseService";
import { NonPlayer } from "../models/NonPlayer";

@Service()
export default class NonPlayerService extends BaseService<NonPlayer> {

    modelName(): string {
        return NonPlayer.name;
    }
}