import {Division} from "../Division";

declare type UmpirePoolDivisionRelation = {
    [umpirePoolId:number]: Division[]
}

export class UmpirePoolsAllocationUpdateDto {
    umpirePools: UmpirePoolDivisionRelation
}