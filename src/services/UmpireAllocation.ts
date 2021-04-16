import {Inject, Service} from "typedi";
import CompetitionService from "./CompetitionService";
import DivisionService from "./DivisionService";
import {UmpireDivisionRef, UmpireService, UmpireTeamsAndOrgsRefs} from "./UmpireService";
import {Competition} from "../models/Competition";
import {Division} from "../models/Division";
import {Booking} from "../models/Booking";
import BookingService from "./BookingService";
import {UmpireAllocationSetting} from "../models/UmpireAllocationSetting";
import {UmpireAllocationTypeEnum} from "../models/enums/UmpireAllocationTypeEnum";
import axios from "axios";
import {AllocationDto} from "../controller/dto/AllocationDto";
import {MatchUmpire} from "../models/MatchUmpire";
import MatchUmpireService from "./MatchUmpireService";
import {NotFoundError} from "../exceptions/NotFoundError";
// TODO move to env
// const competitionApi = process.env.COMPETITION_API_URL;
// const competitionApi = 'https://competition-api-dev.worldsportaction.com';
const competitionApi = 'http://localhost:8087';

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

    @Inject()
    private readonly matchUmpireService: MatchUmpireService;

    modelName(): string {
        return Competition.name;
    }


    public async allocateUmpires(allocationDto: AllocationDto, authToken: string, userId: number): Promise<void> {
        const competitionOrganization = await this.competitionService.findCompetitionOrganization(
            allocationDto.competitionId, allocationDto.organisationId
        );
        if (!competitionOrganization) {
            throw new NotFoundError();
        }
        // const inputData = await this.prepareUmpiresAllocationAlgorithmInputData(allocationDto);
        const inputData = {
            "divisions": [
                {
                    "divisionId": 1974,
                    "divisionName": "AllocDivD",
                    "matchDetails": {
                        "matchType": 0,
                        "gameDuration": 20,
                        "breakDuration": 0,
                        "timeBetweenGames": 0,
                        "mainBreakDuration": 5
                    }
                },
                {
                    "divisionId": 1973,
                    "divisionName": "AllocDivC",
                    "matchDetails": {
                        "matchType": 0,
                        "gameDuration": 20,
                        "breakDuration": 0,
                        "timeBetweenGames": 0,
                        "mainBreakDuration": 5
                    }
                },
                {
                    "divisionId": 1972,
                    "divisionName": "AllocDivB",
                    "matchDetails": {
                        "matchType": 0,
                        "gameDuration": 20,
                        "breakDuration": 0,
                        "timeBetweenGames": 0,
                        "mainBreakDuration": 5
                    }
                },
                {
                    "divisionId": 1971,
                    "divisionName": "AllocDivA",
                    "matchDetails": {
                        "matchType": 0,
                        "gameDuration": 20,
                        "breakDuration": 0,
                        "timeBetweenGames": 0,
                        "mainBreakDuration": 5
                    }
                }
            ],
            "teams": [
                {
                    "teamId": 8423,
                    "teamName": "Alloc team 4",
                    "teamRank": 1,
                    "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                    "division": {
                        "divisionId": 1971,
                        "divisionName": "AllocDivA"
                    },
                    "grade": {
                        "rank": 1,
                        "gradeId": 1971,
                        "gradeName": "AllocDivA"
                    },
                    "venueId": 580
                },
                {
                    "teamId": 8422,
                    "teamName": "Alloc team 3",
                    "teamRank": 2,
                    "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                    "division": {
                        "divisionId": 1971,
                        "divisionName": "AllocDivA"
                    },
                    "grade": {
                        "rank": 1,
                        "gradeId": 1971,
                        "gradeName": "AllocDivA"
                    },
                    "venueId": 580
                },
                {
                    "teamId": 8421,
                    "teamName": "Alloc team 2",
                    "teamRank": 3,
                    "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                    "division": {
                        "divisionId": 1971,
                        "divisionName": "AllocDivA"
                    },
                    "grade": {
                        "rank": 1,
                        "gradeId": 1971,
                        "gradeName": "AllocDivA"
                    },
                    "venueId": 580
                },
                {
                    "teamId": 8420,
                    "teamName": "Alloc team 1",
                    "teamRank": 3,
                    "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                    "division": {
                        "divisionId": 1971,
                        "divisionName": "AllocDivA"
                    },
                    "grade": {
                        "rank": 1,
                        "gradeId": 1971,
                        "gradeName": "AllocDivA"
                    },
                    "venueId": 580
                }
            ],
            "draws": [
                {
                    "divisionId": 1971,
                    "divisionName": "AllocDivA",
                    "grades": [
                        {
                            "gradeName": "AllocDivA",
                            "gradeId": 1971,
                            "rank": 1,
                            "rounds": [
                                {
                                    "roundNumber": 1,
                                    "roundId": 0,
                                    "roundName": 1,
                                    "matches": [
                                        {
                                            "matchId": 26984,
                                            "matchType": 0,
                                            "gameDuration": 90,
                                            "breakDuration": 15,
                                            "timeBetweenGames": 0,
                                            "mainBreakDuration": 15,
                                            "matchStartTime": "2021-04-16T04:00:00.000Z",
                                            "team1": {
                                                "teamId": 8420,
                                                "teamName": "Alloc team 1",
                                                "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                                                "teamRank": 1,
                                                "division": {
                                                    "divisionId": 1971,
                                                    "divisionName": "AllocDivA"
                                                },
                                                "venueId": 580
                                            },
                                            "team2": {
                                                "teamId": 8421,
                                                "teamName": "Alloc team 2",
                                                "teamRank": 2,
                                                "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                                                "division": {
                                                    "divisionId": 1971,
                                                    "divisionName": "AllocDivA"
                                                },
                                                "venueId": 580
                                            }
                                        },
                                        {
                                            "matchId": 26985,
                                            "matchType": 0,
                                            "gameDuration": 90,
                                            "breakDuration": 15,
                                            "timeBetweenGames": 0,
                                            "mainBreakDuration": 15,
                                            "matchStartTime": "2021-04-15T08:00:00.000Z",
                                            "team1": {
                                                "teamId": 8422,
                                                "teamName": "Alloc team 3",
                                                "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                                                "division": {
                                                    "divisionId": 1971,
                                                    "divisionName": "AllocDivA"
                                                },
                                                "venueId": 580
                                            },
                                            "team2": {
                                                "teamId": 8423,
                                                "teamName": "Alloc team 4",
                                                "teamRank": 1,
                                                "organisation": "18238b32-1d44-40a3-b72a-0c106315bf9f",
                                                "division": {
                                                    "divisionId": 1971,
                                                    "divisionName": "AllocDivA"
                                                },
                                                "grade": {
                                                    "rank": 1,
                                                    "gradeId": 1971,
                                                    "gradeName": "AllocDivA"
                                                },
                                                "venueId": 580
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "matchDetails": {
                        "matchType": 0,
                        "gameDuration": 20,
                        "breakDuration": 0,
                        "timeBetweenGames": 0,
                        "mainBreakDuration": 5
                    }
                }
            ],
            "umpires": [
                {
                    "umpireId": 18372,
                    "umpireName": "Mary Johnson",
                    "organisationIds": [],
                    "teamIds": [
                        8421
                    ],
                    "divisionId": 1971,
                    "gradeId": 1971,
                    "unavailableDateTimeslots": []
                },
                {
                    "umpireId": 18373,
                    "umpireName": "John Williams",
                    "organisationIds": [],
                    "teamIds": [
                        8423
                    ],
                    "divisionId": 1972,
                    "gradeId": 1972,
                    "unavailableDateTimeslots": []
                },
                {
                    "umpireId": 18375,
                    "umpireName": "Patricia Brown",
                    "organisationIds": [],
                    "teamIds": [
                        8422
                    ],
                    "divisionId": 1971,
                    "gradeId": 1971,
                    "unavailableDateTimeslots": []
                }
            ],
            "venues": [
                {
                    "venueId": 555,
                    "venueName": "AS Sat 2 courts",
                    "organisationId": null,
                    "availableTimeslots": [
                        {
                            "venueId": 555,
                            "day": "saturday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "sunday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "monday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "tuesday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "wednesday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "thursday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        },
                        {
                            "venueId": 555,
                            "day": "friday",
                            "timeslot": {
                                "startTime": "01:00",
                                "endTime": "23:00"
                            }
                        }
                    ],
                    "unavailableDateTimeslots": [],
                    "courts": [
                        {
                            "courtId": 1036,
                            "courtName": 1,
                            "venueId": 555,
                            "availableTimeslots": [],
                            "unavailableDateTimeslots": []
                        },
                        {
                            "courtId": 1037,
                            "courtName": 2,
                            "venueId": 555,
                            "availableTimeslots": []
                        }
                    ]
                }
            ],
            "umpireType": 3,
            "competitionUniqueKey": "aa6c6d75-72f7-49d0-b511-c1da8654067d",
            "organisationId": "18238b32-1d44-40a3-b72a-0c106315bf9f",
            "timeslotRotation": 5,
            "timeslotGeneration": 2,
            "courtRotation": 8,
            "homeTeamRotation": 2,
            "competitionType": "enhancedRoundRobin",
            "output": 2,
            "competitionStartDate": "2020-12-27T00:00:00.000Z",
            "roundsNumber": 5,
            "roundRobinType": 2,
            "nonPlayingDates": [],
            "timeBetweenRounds": 10080,
            "lockedFixtures": [],
            "manualTimeslots": []
        };

        const results = await this.callUmpireAllocationAlgorithm(inputData, authToken);
        await this.saveUmpiresAllocationsResult(results, userId, competitionOrganization.id);
    }

    protected async prepareUmpiresAllocationAlgorithmInputData(
        allocationDto: AllocationDto
    ): Promise<IUmpireAllocationAlgorithmInput> {
        const {competitionId, rounds} = allocationDto;
        const [competitionData, rawDraws, rawUmpires, umpiresAllocationSetting] = await Promise.all([
            this.competitionService.getCompetitionDataForUmpiresAllocationAlgorithm(competitionId),
            this.divisionService.getDrawsForCompetition(competitionId, rounds),
            this.umpireService.getAllUmpiresAttachedToCompetition(competitionId),
            this.competitionService.getUmpireAllocationSettingForCompetitionOrganiser(competitionId),
        ]);
        const competitionUniqueKey = competitionData.uniqueKey;
        const organisationId = competitionData.linkedCompetitionOrganisation.organisation.organisationUniqueKey;
        const umpiresTeamsAndOrgRefs = await this.umpireService.getUmpiresTeamsAndOrgRefs(rawUmpires.map(umpire => umpire.id));
        const unavailableBookings = await this.bookingService.getUnavailableBookingForUmpires(rawUmpires.map(umpire => umpire.id));
        const umpireDivisionRefs = await this.umpireService.getUmpiresDivisions(competitionId, rawUmpires.map(umpire => umpire.id));

        const [divisions, teams, draws, umpires, umpireType] = await Promise.all([
            this.mapRawDataToDivisionsFormattedData(competitionData),
            this.mapRawDataToTeamsFormattedData(competitionData),
            this.mapRawDataToDrawsFormattedData(rawDraws),
            this.mapUmpiresToUmpireAllocationAlgorithmFormat(rawUmpires, umpiresTeamsAndOrgRefs, unavailableBookings, umpireDivisionRefs),
            this.mapSettingToUmpireType(umpiresAllocationSetting),
        ]);

        return {
            divisions,
            teams,
            draws,
            umpires,
            umpireType,
            competitionUniqueKey,
            organisationId,
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

    protected mapSettingToUmpireType(setting: UmpireAllocationSetting): number {
        if (!setting) {
            return 1;
        }

        switch (setting.umpireAllocationTypeRefId) {
            case UmpireAllocationTypeEnum.OWN_TEAM:
                return 1;
            case UmpireAllocationTypeEnum.OWN_ORGANISATION:
                return 2;
            case UmpireAllocationTypeEnum.VIA_POOLS:
                return 3;
            default:
                return 1;
        }
    }

    protected async callUmpireAllocationAlgorithm(inputData: any, authToken: string): Promise<UmpireAllocationsResult[]> {

        const response = await axios.post(
            `${competitionApi}/api/generate-umpire-allocation`,
            inputData,
            {
                headers: {
                    'Authorization': authToken,
                }
            },
        );

        return response.data;
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

    protected async saveUmpiresAllocationsResult(
        results: UmpireAllocationsResult[],
        createdBy: number,
        competitionOrganisationId: number,
    ): Promise<void> {
        for (let round of results) {
            const {venues} = round;

            for (let venue of venues) {
                const {courts} = venue;

                for (let court of courts) {
                    const {fixtures} = court;

                    for (let fixture of fixtures) {
                        const {match, umpireId, umpireName} = fixture;
                        const matchUmpire = new MatchUmpire();
                        matchUmpire.createdBy = createdBy;
                        matchUmpire.matchId = match.matchId;
                        matchUmpire.competitionOrganisationId = competitionOrganisationId;
                        matchUmpire.sequence = 1;
                        matchUmpire.userId = umpireId;
                        matchUmpire.umpireName = umpireName;
                        matchUmpire.umpireType = "USERS";

                        await this.matchUmpireService.attachUmpireToMatch(match.matchId, [matchUmpire]);
                    }
                }
            }
        }
    }
}

export interface IUmpireAllocationAlgorithmInput {
    divisions: any[],
    teams: any[],
    draws: any[],
    umpires: any[],
    umpireType: number,
    competitionUniqueKey: string,
    organisationId: string,
}

export interface UnavailableDateTimeslot {
    venueId: number,
    date: string,
    timeslot: {
        startTime: string,
        endTime: string,
    }
}

export interface UmpireAllocationsResult {
    roundName: string;
    roundId: number;
    roundStart: Date;
    roundFinish: Date;
    venues: {
        venueName: string;
        venueId: number;
        courts: {
            courtName: string;
            courtId: number;
            fixtures: {
                fixtureId: number;
                divisionId: number;
                gradeId: number;
                match: {
                    matchId: number;
                    team1: object;
                    team2: object;
                };
                roundName: string;
                roundId: number;
                venueId: number;
                venueName: string;
                courtId: number;
                courtName: string;
                date: Date;
                endDate: Date;
                timeslot: {
                    startTime: string,
                    endTime: string,
                };
                outOfRoundDate: boolean;
                outOfCompetitionDate: boolean;
                umpireId: number;
                umpireName: string;
            }[];
        }[];
    }[];
}
