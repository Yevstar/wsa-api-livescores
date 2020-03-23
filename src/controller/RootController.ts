import {Authorized, Get, JsonController, QueryParam, Res} from 'routing-controllers';
import {Response} from "express";
import {BaseController} from "./BaseController";
import compareVersions from 'compare-versions';
// import {cacheManager, flushAll, removeFromCache} from "../cache";

@JsonController()
export class RootController extends BaseController {

    @Get('/ping')
    async ping() {
        return {
            timestamp: Date.now(),
        };
    }

    // @Authorized()
    // @Get('/cache/flushAll')
    // async flushCache() {
    //     return flushAll();
    // }

    // @Authorized()
    // @Get('/cache/removeByKey')
    // async removeByKey(@QueryParam('key', {required: true}) key: string,) {
    //     return removeFromCache(key);
    // }

    @Get('/update')
    async updateInfo(
        @QueryParam('platform', {required: true}) platform: 'android' | 'ios',
        @QueryParam('version', {required: true}) version: string,
        @Res() response: Response) {
        let activeVersion = await this.appService.loadActive(platform);
        if (activeVersion) {
            let versionStatus = '';
            if (compareVersions.compare(version, activeVersion.maxSupportVersion, '>=')) {
                versionStatus = 'UPDATE_NOT_REQUIRED';
            } else if (compareVersions.compare(version, activeVersion.minSupportVersion, '>=') &&
                compareVersions.compare(version, activeVersion.maxSupportVersion, '<=')) {
                versionStatus = 'SOFT_UPDATE_REQUIRED';
            } else if (compareVersions.compare(version, activeVersion.minSupportVersion, '<')) {
                versionStatus = 'FORCED_UPDATE_REQUIRED';
            }
            return {
                appVersion:
                    {
                        latestVersionMessage: activeVersion.updateMessage,
                        latestVersion: activeVersion.maxSupportVersion,
                        versionStatus: versionStatus,
                        latestVersionUpdateURL: activeVersion.applicationUrl
                    }
            };
        } else {
            return response.status(200).send(
                {name: 'search_error', message: `Active version not found`});
        }
    }
}
