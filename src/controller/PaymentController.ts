import { Response } from 'express';
import { Authorized, Body, HeaderParam, JsonController, Post, Res } from 'routing-controllers';
import Stripe from 'stripe';
import { User } from "../models/User";
import { isArrayPopulated } from '../utils/Utils';
import { BaseController } from './BaseController';
import {CompetitionOrganisationRoleEnum} from "../models/enums/CompetitionOrganisationRoleEnum";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-03-02' });

@JsonController('/api/payments')
export class PaymentController extends BaseController {

    @Authorized()
    @Post('/umpireTransfer')
    async createStripeTransfersToUmpireAccount(
        @HeaderParam("authorization") currentUser: User,
        @Body() transfersBody: any,
        @Res() response: Response): Promise<any> {
        try {

            const organisationKey = transfersBody.organisationUniqueKey;
            const currentOrgDetails = await this.organisationService.findOrganisationByUniqueKey(organisationKey);
            console.log('currentOrgDetails  :::: ', currentOrgDetails)
            if (isArrayPopulated(currentOrgDetails)) {

                const stripeAccount = currentOrgDetails[0].stripeAccountID;
                const orgCustomerId = currentOrgDetails[0].stripeCustomerAccountId;
                const orgPmId = currentOrgDetails[0].stripeBecsMandateId
                const orgBalance = await stripe.balance.retrieve({ stripeAccount });
                console.log('orgBalance  :::: ', orgBalance)

                const STATUS = transfersBody.statusId
                if (isArrayPopulated(transfersBody.transfers)) {
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
                            await this.stripePayConnectWithBecs(STRIPE_AMOUNT, stripeId, orgCustomerId, orgPmId, response);
                        }
                    }
                } else {
                    return response.status(212).send(`Please pass transfers list to make transfers`);
                }
                return { success: true }
            } else {
                return response.status(212).send(`Error in finding organisation details`);
            }
        } catch (err) {
            return response.status(400).send(`Error in sending transfer to another stripeAccount: ${err}`);
        }
    }

    public async stripePayConnectWithBecs(
        amount: number,
        connectId: string,
        customerId: string,
        paymentMethodId: string,
        response: Response
    ) {
        try {
            const currency = 'aud';
            await stripe.paymentIntents.create({
                amount: amount * 1000,
                currency,
                payment_method_types: ["au_becs_debit"],
                customer: customerId,
                payment_method: paymentMethodId,
                confirm: true,
                on_behalf_of: connectId,
                mandate_data: {
                    customer_acceptance: {
                        type: "online",
                    },
                },
                transfer_data: {
                    destination: connectId,
                },
            });
        } catch(err) {
            return response.status(400).send(`Error in becs to connect transfer to another: ${err}`);
        }
    }
}

