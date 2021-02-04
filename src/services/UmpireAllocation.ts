import {Inject, Service} from "typedi";
import CompetitionService from "./CompetitionService";

@Service()
export default class UmpireAllocation {

    @Inject()
    private readonly competitionService: CompetitionService;

    public async allocateUmpires(competitionId: number): Promise<void> {
        const competitionData = await this.competitionService.getCompetitionDataForUmpiresAllocationAlgorithm(competitionId);
        console.log(`competitionData - ${JSON.stringify(competitionData)}`);
    }

    private async callUmpireAllocationAlgorithm(inputData: IUmpireAllocationAlgorithmInput): Promise<void> {
        // TODO
    }
}

// TODO need more detailed definition
export interface IUmpireAllocationAlgorithmInput {
    divisions: {divisionId: number, divisionName: string}[],
    teams: [],
    draws: [],
    umpires: [],
}
