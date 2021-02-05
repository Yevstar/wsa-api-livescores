import {
  JsonController,
  Authorized,
  Res,
  Post,
  Body,
  Patch,
  QueryParam,
} from "routing-controllers";
import { Response } from "express";
import { Inject } from "typedi";
import { validate } from "class-validator";

import SuspensionService from "../services/SuspensionService";
import { SuspensionDto } from "../models/dto/SuspensionDto";

@JsonController("/suspension")
export class SuspensionController {
  @Inject()
  protected suspensionService: SuspensionService;

  @Authorized()
  @Post("/")
  async createSuspension(
    @Body() suspensionDto: SuspensionDto,
    @Res() response: Response
  ) {
    const errors = await validate(suspensionDto);

    if (errors.length) {
      return response.status(400).send({
        success: false,
        name: "validation_error",
        errors,
      });
    }

    const createdSuspension = await this.suspensionService.createOne(
      suspensionDto
    );
    return response.status(200).send({ createdSuspension });
  }

  @Authorized()
  @Patch("/")
  async updateSuspension(
    @QueryParam("id", { required: true }) suspensionId: number,
    @Body() suspensionDto: SuspensionDto,
    @Res() response: Response
  ) {
    const errors = await validate(suspensionDto);

    if (errors.length) {
      return response.status(400).send({
        success: false,
        name: "validation_error",
        errors,
      });
    }

    const updatedSuspension = await this.suspensionService.updateOne(
      suspensionId,
      suspensionDto
    );
    return response.status(200).send({ updatedSuspension });
  }
}
