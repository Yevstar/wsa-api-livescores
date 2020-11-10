import { Response, response } from "express";
import {
    Get,
    Post,
    Authorized,
    Res,
    QueryParam,
    Body,
    JsonController
} from "routing-controllers";

import { BaseController } from "./BaseController";
import { Booking } from "../models/Booking";
import { isArrayPopulated, isNotNullAndUndefined } from "../utils/Utils";

@JsonController("/booking")
export class BookingController extends BaseController {

    @Authorized()
    @Get("/")
    async find(
        @QueryParam("userId", { required: true }) userId: number,
        @QueryParam("fromTime") fromTime: Date,
          @QueryParam("endTime") endTime: Date
    ): Promise<Booking[]> {
        return this.bookingService.findByParams(userId, fromTime, endTime);
    }

    @Authorized()
    @Post("/save")
    async saveBookings(
      @QueryParam("userId", { required: true }) userId: number,
      @QueryParam("fromTime") fromTime: Date,
      @QueryParam("endTime") endTime: Date,
      @Body() bookings: Booking[],
      @Res() response: Response
    ): Promise<any> {
        if (isArrayPopulated(bookings)) {
            try {
                // Initially will check if all the bookings provided
                // has necessary information or not. If any of them doesn't
                // have then throw an error.
                const count = bookings.filter(
                  booking => (!isNotNullAndUndefined(booking.userId) ||
                      !isNotNullAndUndefined(booking.created_by) ||
                      !isNotNullAndUndefined(booking.startTime) ||
                      !isNotNullAndUndefined(booking.endTime))
                  ).length;
                if (count != 0) {
                        throw (count == 1) ? `${count} booking has missing information` :
                         `${count} bookings has missing information`;
                }

                // Delete any existing bookings based on their user id,
                // start time and end time
                if (isNotNullAndUndefined(fromTime) &&
                      isNotNullAndUndefined(endTime)) {
                          await this.deleteBookings(
                              userId,
                              fromTime,
                              endTime
                          );
                }

                var bookingsData = [];
                // Delete any existing bookings based on userId and saving booking start time
                // if we haven't got any from time and end time from the caller.
                for (let booking of bookings) {
                    if (!isNotNullAndUndefined(fromTime) &&
                          !isNotNullAndUndefined(endTime)) {
                              await this.deleteBookings(
                                  userId,
                                  booking.startTime
                              );
                    }

                    const data = new Booking();
                    data.userId = booking.userId;
                    data.startTime = new Date(booking.startTime);
                    data.endTime = new Date(booking.endTime);
                    data.type = booking.type;
                    data.created_by = booking.created_by;
                    bookingsData.push(data);
                }

                await this.bookingService.batchCreateOrUpdate(bookingsData);

                return response.status(200).send({
                    success: true
                });
            } catch (error) {
                return response.status(212).send({
                    success: false,
                    message: `Bookings failed to save due to ${error}`
                });
            }
        } else {
            return response.status(400).send({
                name: 'save_error',
                message: `Bookings data has not been provided`
            });
        }
    }

    private async deleteBookings(
      userId: number,
      fromDate: Date,
      toDate: Date = undefined
    ) {
        let existingBookings = await this.bookingService.findByParams(
            userId,
            fromDate,
            toDate
        );
        if (existingBookings.length > 0) {
          const existingBookingIds = existingBookings.map(function(booking){
              return booking.id;
          });
          await this.bookingService.deleteByIds(existingBookingIds);
        }
    }
}
