import { Request, Response } from 'express';
import {Authorized, Body, HeaderParam, JsonController, Post, Req, Res} from 'routing-controllers';
import Stripe from 'stripe';
import { User } from "../models/User";
import { isArrayPopulated } from '../utils/Utils';
import { BaseController } from './BaseController';
import {CompetitionOrganisationRoleEnum} from "../models/enums/CompetitionOrganisationRoleEnum";
import {Inject} from "typedi";
import StripeService from "../services/StripeService";
import {UmpirePaymentTransferResponse} from "./dto/UmpirePaymentTransferResponse";

@JsonController('/api/payments')
export class PaymentController extends BaseController {

    @Inject()
    stripeService: StripeService;

    @Authorized()
    @Post('/umpireTransfer')
    async createStripeTransfersToUmpireAccount(
        @Req() request: Request,
        @HeaderParam("authorization") currentUser: User,
        @Body() transfersBody: any,
        @Res() response: Response): Promise<any> {
        try {
            const organisationKey = transfersBody.organisationUniqueKey;
            const rawHeaders = request.rawHeaders;
            const authorizationIndex = rawHeaders.indexOf("Authorization");
            const authToken = rawHeaders[authorizationIndex + 1];

            const currentOrgDetails = await this.organisationService.findOrganisationByUniqueKey(organisationKey, authToken);
            console.log('currentOrgDetails  :::: ', currentOrgDetails)
            if (!currentOrgDetails) {

                const stripeAccount = currentOrgDetails.stripeAccountID;
                const orgCustomerId = currentOrgDetails.stripeCustomerAccountId;
                const orgPmId = currentOrgDetails.stripeBecsMandateId
                const orgBalance = await this.stripeService.getBalance(stripeAccount);
                console.log('orgBalance  :::: ', orgBalance)

                const STATUS = transfersBody.statusId
                if (isArrayPopulated(transfersBody.transfers)) {
                    const responseBody: UmpirePaymentTransferResponse = {transfers: []};

                    for (let i of transfersBody.transfers) {
                        if (STATUS === 1) { // submit button
                            const amount = 1;
                            const umpire = await this.umpireService.findByMatchUmpire(i.matchUmpireId);
                            const stripeId = umpire.stripeAccountId;
                            const organisationRole = CompetitionOrganisationRoleEnum.ORGANISER;
                            const STRIPE_AMOUNT = await this.matchUmpireService.calculatePaymentForUmpire(i.matchUmpireId, currentOrgDetails.id);
                            console.log(`stripeId - ${stripeId}`);
                            console.log(`STRIPE_AMOUNT - ${STRIPE_AMOUNT}`);
                            // const transferGroup = (i.matchUmpireId).toString();
                            // await this.createStripeTransfers(STRIPE_AMOUNT, i.stripeId, transferGroup, stripeAccount, response);
                            let error: string = null;
                            try {
                                await this.stripeService.makePaymentIntent(STRIPE_AMOUNT, stripeId, orgCustomerId, orgPmId);
                            } catch (e) {
                                error = e;
                            }
                            responseBody.transfers.push({
                                success: !!error,
                                error: error,
                                transfer: {
                                    umpireId: umpire.id,
                                    stripeId: stripeId,
                                    amount: STRIPE_AMOUNT,
                                }
                            });
                        }
                    }

                    return response.status(200).send(responseBody);
                } else {
                    return response.status(212).send(`Please pass transfers list to make transfers`);
                }
            } else {
                return response.status(212).send(`Error in finding organisation details`);
            }
        } catch (err) {
            console.log(`err - ${err}`);
            return response.status(400).send(`Error in sending transfer to another stripeAccount: ${err}`);
        }
    }
}

