import { z } from "zod";
import { env } from "../config/env.js";
import { getDB } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { PREMIUM_PLAN } from "../constants/premium.js";
import type { TransactionDoc } from "../types/transaction.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isPremiumActive } from "../utils/premium.js";
import { getUser } from "../utils/requestUser.js";

const transactions = () => getDB().collection<TransactionDoc>("transactions");

const sessionIdSchema = z
  .string()
  .regex(/^cs_(test|live)_[A-Za-z0-9]+$/, "Invalid checkout session id");

async function findSubscriptionId(vendorId: string): Promise<string | null> {
  const paid = await transactions().findOne(
    { vendorId, status: "paid", stripeSubscriptionId: { $ne: null } },
    { sort: { createdAt: -1 } }
  );
  return paid?.stripeSubscriptionId ?? null;
}

// POST /api/payments/checkout
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const user = getUser(req); // the vendor comes from the verified login, never from the body

  if (isPremiumActive(user)) {
    throw ApiError.conflict("You already have an active Premium subscription");
  }

  // Earlier unfinished attempts are no longer valid.
  await transactions().updateMany(
    { vendorId: user.id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PREMIUM_PLAN.currency,
            unit_amount: PREMIUM_PLAN.priceCents,
            recurring: { interval: "month" },
            product_data: {
              name: PREMIUM_PLAN.name,
              description: PREMIUM_PLAN.description,
            },
          },
        },
      ],
      metadata: { vendorId: user.id },
      subscription_data: { metadata: { vendorId: user.id } },
      success_url: `${env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/payment/cancel`,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    throw new ApiError(502, "The payment service is unavailable. Please try again.");
  }

  if (!session.url) throw new ApiError(502, "Could not start checkout");

  await transactions().insertOne({
    vendorId: user.id,
    plan: "premium",
    amount: PREMIUM_PLAN.priceCents,
    currency: PREMIUM_PLAN.currency,
    stripeSessionId: session.id,
    stripeSubscriptionId: null,
    status: "pending",
    createdAt: new Date(),
  });

  res.status(201).json({ success: true, url: session.url });
});

// GET /api/payments/subscription
export const getSubscription = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const premium = isPremiumActive(user);

  let cancelAtPeriodEnd = false;
  if (premium) {
    const subscriptionId = await findSubscriptionId(user.id);
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      } catch (error) {
        console.error("Could not read subscription from Stripe:", error);
      }
    }
  }

  res.json({
    success: true,
    subscription: {
      plan: premium ? "premium" : "free",
      expiresAt: premium ? user.subscriptionExpiresAt : null,
      cancelAtPeriodEnd,
      priceCents: PREMIUM_PLAN.priceCents,
      currency: PREMIUM_PLAN.currency,
    },
  });
});

// POST /api/payments/cancel  (cancels at the end of the paid period)
export const cancelSubscription = asyncHandler(async (req, res) => {
  const user = getUser(req);

  if (!isPremiumActive(user)) {
    throw ApiError.badRequest("You do not have an active Premium subscription");
  }

  // Found through THIS vendor's own transactions, so nobody can cancel another vendor's plan.
  const subscriptionId = await findSubscriptionId(user.id);
  if (!subscriptionId) throw ApiError.notFound("No subscription found for your account");

  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  } catch (error) {
    console.error("Stripe cancel error:", error);
    throw new ApiError(502, "Could not cancel the subscription. Please try again.");
  }

  res.json({
    success: true,
    message: "Your subscription will end at the end of the current billing period",
  });
});

// GET /api/payments/session/:sessionId  (used by the Payment Success page)
export const getCheckoutResult = asyncHandler(async (req, res) => {
  const user = getUser(req);
  const sessionId = sessionIdSchema.parse(req.params.sessionId);

  // The vendorId filter means a vendor can only see their own payments.
  const transaction = await transactions().findOne({
    stripeSessionId: sessionId,
    vendorId: user.id,
  });
  if (!transaction) throw ApiError.notFound("Payment not found");

  res.json({
    success: true,
    transaction: {
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      plan: transaction.plan,
    },
    premiumActive: isPremiumActive(user),
  });
});