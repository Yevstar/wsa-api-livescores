import Stripe from "stripe";
import {Service} from "typedi";

@Service()
export default class StripeService {
    protected stripe: Stripe;

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-03-02' });
    }

    public getBalance(stripeAccount: string): Promise<Stripe.Balance> {
        return this.stripe.balance.retrieve({ stripeAccount });
    }

    public async makePaymentIntent(
        amount: number,
        connectId: string,
        customerId: string,
        paymentMethodId: string,
    ): Promise<Stripe.PaymentIntent> {
        const currency = 'aud';
        return this.stripe.paymentIntents.create({
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
    }
}
