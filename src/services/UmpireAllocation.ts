import {Inject, Service} from "typedi";
import CompetitionService from "./CompetitionService";
import DivisionService from "./DivisionService";
import {UmpireDivisionRef, UmpireService, UmpireTeamsAndOrgsRefs} from "./UmpireService";
import {Competition} from "../models/Competition";
import {Division} from "../models/Division";
import {Booking} from "../models/Booking";
import BookingService from "./BookingService";

@Service()
export default class UmpireAllocation {

    @Inject()
    private readonly competitionService: CompetitionService;

    @Inject()
    private readonly divisionService: DivisionService;

    @Inject()
    private readonly umpireService: UmpireService;

    @Inject()
    private readonly bookingService: BookingService;


    public async allocateUmpires(competitionId: number): Promise<void> {
        const inputData = await this.prepareUmpiresAllocationAlgorithmInputData(competitionId);

        await this.callUmpireAllocationAlgorithm(inputData);
    }

    protected async prepareUmpiresAllocationAlgorithmInputData(competitionId: number): Promise<IUmpireAllocationAlgorithmInput> {

        const [competitionData, rawDraws, rawUmpires] = await Promise.all([
            this.competitionService.getCompetitionDataForUmpiresAllocationAlgorithm(competitionId),
            this.divisionService.getDrawsForCompetition(competitionId),
            this.umpireService.getAllUmpiresAttachedToCompetition(competitionId),
        ]);

        const umpiresTeamsAndOrgRefs = await this.umpireService.getUmpiresTeamsAndOrgRefs(rawUmpires.map(umpire => umpire.id));
        const unavailableBookings = await this.bookingService.getUnavailableBookingForUmpires(rawUmpires.map(umpire => umpire.id));
        const umpireDivisionRefs = await this.umpireService.getUmpiresDivisions(competitionId, rawUmpires.map(umpire => umpire.id));

        const [divisions, teams, draws, umpireType] = await Promise.all([
            this.mapRawDataToDivisionsFormattedData(competitionData),
            this.mapRawDataToTeamsFormattedData(competitionData),
            this.mapRawDataToDrawsFormattedData(rawDraws),
            this.mapUmpiresToUmpireAllocationAlgorithmFormat(rawUmpires, umpiresTeamsAndOrgRefs, unavailableBookings, umpireDivisionRefs),
            this.getUmpireType(competitionId),
        ]);

        return {
            divisions,
            teams,
            draws,
            umpires: [],
            umpireType: 1,
        };
    }

    protected async mapRawDataToDivisionsFormattedData(rawData: Competition): Promise<any[]> {
        const {divisions} = rawData;

        return divisions.map(division => {

            return {
                divisionId: division.id,
                divisionName: division.name,
            }
        });
    }

    protected async mapRawDataToTeamsFormattedData(rawData: Competition): Promise<any[]> {
        const {teams} = rawData;

        return teams.map(team => {
            return {
                teamId: team.id,
                teamName: team.name,
                organisation: team.linkedCompetitionOrganisation ?
                    team.linkedCompetitionOrganisation.organisation.organisationUniqueKey :
                    null,
                division: team.division ? {
                    divisionId: team.division.id,
                    divisionName: team.division.name,
                } : null,
            };
        });
    }

    protected async mapRawDataToDrawsFormattedData(rawData: Division[]): Promise<any[]> {

        return rawData.map(division => {

            return {
                divisionId: division.id,
                divisionName: division.name,
                rounds: division.rounds.map(round => {
                    return {
                        roundNumber: round.sequence,
                        matches: round.matches.map(match => {
                            return {
                                matchId: match.id,
                                matchType: this.mapMatchTypeToNumber(match.type),
                                gameDuration: match.matchDuration,
                                breakDuration: match.breakDuration,
                                // TODO
                                timeBetweenGames: 0,
                                mainBreakDuration: match.mainBreakDuration,
                                matchStartTime: match.startTime,
                                team1: match.team1 ? {
                                    teamId: match.team1.id,
                                    teamName: match.team1.name,
                                    organisation: match.team1.linkedCompetitionOrganisation ?
                                        match.team1.linkedCompetitionOrganisation.organisation.organisationUniqueKey : null,
                                    division: match.team1.division ?
                                        {
                                            divisionId: match.team1.division.id,
                                            divisionName: match.team1.division.name
                                        } : null,
                                } : null,
                            };
                        }),
                    };
                }),
            };
        });
    }

    protected async mapUmpiresToUmpireAllocationAlgorithmFormat(
        rawData: any[],
        umpiresTeamsAndOrgRefs: UmpireTeamsAndOrgsRefs[],
        unavailableBookings: Booking[],
        umpireDivisionRefs: UmpireDivisionRef[],
    ): Promise<any[]> {

        return rawData.map(umpire => {
            const currentUmpiresTeamsAndOrgRefs = umpiresTeamsAndOrgRefs.find(ref => ref.umpireId === umpire.id);
            const currentUnavailableBookings = unavailableBookings.filter(booking => booking.userId === umpire.id);
            const {divisionId} = umpireDivisionRefs.find(ref => ref.umpireId === umpire.id);

            return {
                umpireId: umpire.id,
                umpireName: `${umpire.firstName} ${umpire.lastName}`,
                organisationIds: currentUmpiresTeamsAndOrgRefs ? currentUmpiresTeamsAndOrgRefs.organisationIds : [],
                teamIds: currentUmpiresTeamsAndOrgRefs ? currentUmpiresTeamsAndOrgRefs.teamIds : [],
                divisionId,
                availableTimeslots: [],
                unavailableDateTimeslots: currentUnavailableBookings.map(booking => this.mapBookingToUnavailableDateTimeslot(booking)),
            };
        });
    }

    protected async getUmpireType(competitionId: number): Promise<any> {
        // TODO
        return 1;
    }

    protected async callUmpireAllocationAlgorithm(inputData: IUmpireAllocationAlgorithmInput): Promise<void> {
        // TODO
    }

    protected mapMatchTypeToNumber(matchType: "FOUR_QUARTERS" | "TWO_HALVES" | "SINGLE_PERIOD"): number {
        switch (matchType) {
            case "FOUR_QUARTERS":
                return 1;
            case "TWO_HALVES":
                return 0;
            case "SINGLE_PERIOD":
                return 2;
            default:
                return null;
        }
    }

    protected mapBookingToUnavailableDateTimeslot(booking: Booking): UnavailableDateTimeslot {
        const startTime = `${this.twoDigitFormatTime(booking.startTime.getHours())}:${this.twoDigitFormatTime(booking.startTime.getMinutes())}`;
        const endTime = `${this.twoDigitFormatTime(booking.endTime.getHours())}:${this.twoDigitFormatTime(booking.endTime.getMinutes())}`;
        return {
            venueId: null,
            date: booking.startTime.toISOString(),
            timeslot: {
                startTime,
                endTime,
            }
        }
    }

    protected twoDigitFormatTime(time: number): string {

        return ("0" + time).slice(-2);
    }
}

export interface IUmpireAllocationAlgorithmInput {
    divisions: any[],
    teams: any[],
    draws: any[],
    umpires: any[],
    umpireType: number,
}

export interface UnavailableDateTimeslot {
    venueId: number,
    date: string,
    timeslot: {
        startTime: string,
        endTime: string,
    }
}
