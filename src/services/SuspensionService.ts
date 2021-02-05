import { Service } from "typedi";
import { UpdateResult } from "typeorm";

import BaseService from "./BaseService";
import { Suspension } from "../models/Suspension";
import { SuspensionDto } from "../models/dto/SuspensionDto";

@Service()
export default class SuspensionService extends BaseService<Suspension> {
  modelName(): string {
    return Suspension.name;
  }

  async createOne(suspensionDto: SuspensionDto): Promise<SuspensionDto> {
    const createdSuspension = await this.entityManager.save(
      Suspension,
      suspensionDto
    );

    return createdSuspension;
  }

  async updateOne(
    id: number,
    suspensionDto: SuspensionDto
  ): Promise<UpdateResult> {
    const updatedSuspension = await this.entityManager.update(
      Suspension,
      { id },
      suspensionDto
    );

    return updatedSuspension;
  }

  async findOne(suspensionDto: SuspensionDto): Promise<Suspension> {
    const suspension = await this.entityManager.findOne(
      Suspension,
      suspensionDto
    );

    return suspension;
  }

  async findMany(suspensionDto: SuspensionDto): Promise<Suspension[]> {
    const suspensions = await this.entityManager.find(
      Suspension,
      suspensionDto
    );

    return suspensions;
  }
}
