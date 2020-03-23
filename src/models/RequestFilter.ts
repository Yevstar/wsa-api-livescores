export interface RequestFilter {
    paging: Paging;
    search: string;
}

export interface Paging {
    limit: number,
    offset: number
}
