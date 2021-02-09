import {Inject, Service} from "typedi";
import CompetitionService from "./CompetitionService";
import DivisionService from "./DivisionService";
import {UmpireService} from "./UmpireService";

@Service()
export default class UmpireAllocation {

    @Inject()
    private readonly competitionService: CompetitionService;

    @Inject()
    private readonly divisionService: DivisionService;

    @Inject()
    private readonly umpireService: UmpireService;


    public async allocateUmpires(competitionId: number): Promise<void> {
        const competitionData = await this.competitionService.getCompetitionDataForUmpiresAllocationAlgorithm(competitionId);
        const draws = await this.divisionService.getDrawsForCompetition(competitionId);
        const umpires = await this.umpireService.getAllUmpiresAttachedToCompetition(competitionId);
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
    // TODO
    umpireType: string,

}
