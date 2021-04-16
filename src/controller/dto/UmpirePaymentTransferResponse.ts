export declare type UmpirePaymentTransferResponse = {
    transfers: UmpirePaymentTransfer[],
}

type UmpirePaymentTransfer = {
    success: boolean,
    error?: string,
    transfer: {
        umpireId: number,
        stripeId: string,
        amount: number,
    }
}
