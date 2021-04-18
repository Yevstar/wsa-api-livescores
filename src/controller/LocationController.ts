import { Authorized, Get, JsonController, QueryParam } from 'routing-controllers';
import { Location } from '../models/Location';
import { BaseController } from './BaseController';

@Authorized()
@JsonController('/locations')
export class LocationController extends BaseController {
  @Get('/')
  async find(@QueryParam('name') name: string): Promise<Location[]> {
    return this.locationService.findByName(name);
  }

  @Get('/')
  async all(): Promise<Location[]> {
    return this.locationService.findAll();
  }
}
