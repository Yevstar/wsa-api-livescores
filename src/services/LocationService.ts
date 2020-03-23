import {Service} from "typedi";
import BaseService from "./BaseService";
import {Location} from "../models/Location";

@Service()
export default class LocationService extends BaseService<Location> {

    modelName(): string {
        return Location.name;
    }

    public async findByName(name?: string): Promise<Location[]> {
        let query = this.entityManager.createQueryBuilder(Location, 'location');
        if (name) {
            query = query.where('LOWER(location.name) like :name', {name: `${name.toLowerCase()}%`});
        }
        return query.getMany()
    }

    public async findAll(): Promise<Location[]> {
        return this.entityManager.createQueryBuilder(Location, 'location').getMany();
    }

}

