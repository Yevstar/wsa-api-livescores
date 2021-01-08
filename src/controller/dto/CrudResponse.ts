import {BaseEntity} from "typeorm-plus";

export interface CrudResponse<T extends BaseEntity> {
    page: {
        nextPage?: number,
        prevPage?: number,
        totalCount: number,
        currentPage: number,
    },
    data: T[]
}