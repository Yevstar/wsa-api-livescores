import {Service} from "typedi";

import BaseService from "./BaseService";
import {DeleteResult} from "typeorm-plus";
import {Booking} from "../models/Booking";
import { isNotNullAndUndefined } from "../utils/Utils";

@Service()
export default class BookingService extends BaseService<Booking> {
    modelName(): string {
        return Booking.name;
    }

    public async findByParams(
        userId: number,
        fromTime: Date = undefined,
        endTime: Date = undefined
    ): Promise<Booking[]> {
        let query = this.entityManager
            .createQueryBuilder(Booking, "booking")
            .where("booking.userId = :userId", {userId});
            
        if (isNotNullAndUndefined(fromTime) &&
              isNotNullAndUndefined(endTime)) {
            let startDate = new Date(fromTime);
            let endDate = new Date(endTime);
            query.andWhere(
                "booking.startTime >= :fromDate " +
                "and booking.startTime <= :toDate",
                { fromDate: startDate, toDate: endDate }
            );
        } else if (isNotNullAndUndefined(fromTime)) {
            let startDate = new Date(fromTime);
            let endDate = new Date(fromTime);
            endDate.setHours(endDate.getHours() + 24);
            query.andWhere(
                "booking.startTime >= :fromDate " +
                "and booking.startTime <= :toDate",
                { fromDate: startDate, toDate: endDate }
            );
        }

        return query.getMany();
    }

    public async deleteByIds(ids: number[]): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(Booking)
            .andWhere("id in (:ids)", {ids: ids}).execute();
    }

    public async getUnavailableBookingForUmpires(umpireIds: number[]): Promise<Booking[]> {
        umpireIds = umpireIds.length ? umpireIds : [null];

        return await this.entityManager.createQueryBuilder(Booking, "booking")
            .where('booking.userId IN (:umpireIds) AND type = "UNAVAILABLE"', {umpireIds})
            .getMany();
    }
}
