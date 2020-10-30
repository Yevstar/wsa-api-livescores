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
        byDate: Date
    ): Promise<Booking[]> {
        let query = this.entityManager
            .createQueryBuilder(Booking, "booking")
            .where("booking.userId = :userId", {userId});

        if (isNotNullAndUndefined(byDate)) {
            let fromDate = new Date(byDate);
            let toDate = new Date(byDate);
            toDate.setHours(toDate.getHours() + 24);
            query.andWhere(
                "booking.startTime >= :fromDate " +
                "and booking.startTime <= :toDate",
                { fromDate: fromDate, toDate: toDate }
            );
        }

        return query.getMany();
    }

    public async deleteByIds(ids: number[]): Promise<DeleteResult> {
        return this.entityManager.createQueryBuilder().delete().from(Booking)
            .andWhere("id in (:ids)", {ids: ids}).execute();
    }
}
