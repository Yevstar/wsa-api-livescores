import {Service} from "typedi";
import BaseService from "../services/BaseService";
import {CommunicationTrack} from "../models/CommunicationTrack";

@Service()
export default class CommunicationTrackService extends BaseService<CommunicationTrack> {

    modelName(): string {
        return CommunicationTrack.name;
    }
}