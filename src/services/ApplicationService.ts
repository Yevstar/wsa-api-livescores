import {Service} from "typedi";
import BaseService from "./BaseService";
import {Application} from "../models/Application";

@Service()
export default class ApplicationService extends BaseService<Application> {

    modelName(): string {
        return Application.name;
    }

    public async loadActive(platform: 'android' | 'ios'): Promise<Application> {
        return this.entityManager.createQueryBuilder(Application, 'app')
            .andWhere('app.platform = :platform', {platform})
            .andWhere('app.active = 1')
            .getOne()
    }
}

