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
        @QueryParam("byDate") byDate: Date,
    ): Promise<Booking[]> {
        return this.bookingService.findByParams(userId, byDate);
    }

    @Authorized()
    @Post("/save")
    async saveBookings(
      @QueryParam("userId", { required: true }) userId: number,
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
                  if (count == 1) {
                      throw `${count} booking has missing information`;
                  } else {
                      throw `${count} bookings has missing information`;
                  }
              }

              var bookingsData = [];
              // Delete any existing bookings based on their start time and userId
              for (let booking of bookings) {
                  let existingBookings = await this.bookingService.findByParams(
                      booking.userId,
                      booking.startTime
                  );
                  if (existingBookings.length > 0) {
                    const existingBookingIds = existingBookings.map(function(booking){
                        return booking.id;
                    });
                    await this.bookingService.deleteByIds(existingBookingIds);
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
              message: `Bookings data is missing`
          });
      }
    }
}
