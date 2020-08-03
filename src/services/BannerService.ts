import {Service} from "typedi";

import BaseService from "./BaseService";
import {Banner} from "../models/Banner";

@Service()
export default class BannerService extends BaseService<Banner> {
    modelName(): string {
        return Banner.name;
    }

    public async findByParams(
        competitionIds: number[],
        pageType: "HOME" | "DRAWS" | "LADDER" | "CHAT" | "NEWS",
        format: "Horizontal" | "Square"
    ): Promise<Banner[]> {
        let query = this.entityManager
            .createQueryBuilder(Banner, "banner")
            .select('distinct banner.*')
            .where("banner.competitionId in (:competitionIds)", {
                competitionIds
            });

        if (pageType) {
            switch (pageType) {
                case "HOME":
                    query.andWhere("banner.showOnHome = 1");
                    break;
                case "DRAWS":
                    query.andWhere("banner.showOnDraws = 1");
                    break;
                case "LADDER":
                    query.andWhere("banner.showOnLadder = 1");
                    break;
                case "NEWS":
                    query.andWhere("banner.showOnNews = 1");
                    break;
                case "CHAT":
                    query.andWhere("banner.showOnChat = 1");
                    break;
            }
        }

        if (format) {
            query.andWhere("banner.format = :format", { format });
        }

        return query.getRawMany();
    }

    public async deleteByCompetitionId(id?: number) {
        return this.entityManager
            .createQueryBuilder()
            .delete()
            .from(Banner, 'banner')
            .where('competitionId = :id', { id })
            .execute();
    }

}
