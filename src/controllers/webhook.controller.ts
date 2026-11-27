import type { Request, Response } from "express";
import type Stripe from "stripe";
import { env } from "../config/env.js";
import { getDB } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import { PREMIUM_PLAN } from "../constants/premium.js";
import {
  activatePremium,
  downgradeToFree,
} from "../services/subscription.service.js";
import type { TransactionDoc } from "../types/transaction.js";

const transactions = () => getDB().collection<TransactionDoc>("transactions");

// Newer Stripe API versions moved the period end onto the subscription items.
function getPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const raw = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const seconds = raw.items?.data?.[0]?.current_period_end ?? raw.current_period_end;
  return seconds ? new Date(seconds * 1000) : null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  type Ref = string | { id: string } | null | undefined;
  const raw = invoice as unknown as {
    subscription?: Ref;
    parent?: { subscription_details?: { subscription?: Ref } | null } | null;
  };
  const ref = raw.parent?.subscription_details?.subscription ?? raw.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

async function onCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || session.payment_status !== "paid") return;

  const vendorId = session.metadata?.vendorId ?? session.client_reference_id;
  if (!vendorId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);

  // Safe to run twice: it only sets values.
  await transactions().updateOne(
    { stripeSessionId: session.id },
    {
      $set: {
        status: "paid",
        stripeSubscriptionId: subscriptionId,
        amount: session.amount_total ?? PREMIUM_PLAN.priceCents,
        currency: session.currency ?? PREMIUM_PLAN.currency,
      },
      $setOnInsert: { vendorId, plan: "premium", createdAt: new Date() },
    },
    { upsert: true }
  );

  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = getPeriodEnd(subscription);
  if (periodEnd) await activatePremium(vendorId, periodEnd);
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const vendorId = subscription.metadata?.vendorId;
  const periodEnd = getPeriodEnd(subscription);
  if (vendorId && periodEnd) await activatePremium(vendorId, periodEnd);
}

async function onSubscriptionUpdated(subscription: Stripe.Subscription) {
  const vendorId = subscription.metadata?.vendorId;
  if (!vendorId) return;

  if (subscription.status === "active" || subscription.status === "trialing") {
    const periodEnd = getPeriodEnd(subscription);
    if (periodEnd) await activatePremium(vendorId, periodEnd);
  } else if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    await downgradeToFree(vendorId);
  }
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const vendorId = subscription.metadata?.vendorId;
  if (vendorId) await downgradeToFree(vendorId);
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await onCheckoutPaid(event.data.object as Stripe.Checkout.Session);
      break;

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await transactions().updateOne(
        { stripeSessionId: session.id, status: "pending" },
        { $set: { status: "failed" } }
      );
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await transactions().updateOne(
        { stripeSessionId: session.id, status: "pending" },
        { $set: { status: "cancelled" } }
      );
      break;
    }

    case "invoice.paid":
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      console.warn("A subscription payment failed. Stripe will retry it.");
      break;

    case "customer.subscription.updated":
      await onSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      break; // other events are ignored
  }
}

// POST /api/payments/webhook
// req.body is the RAW body here (see app.ts). The signature proves it came from Stripe.
export async function stripeWebhook(req: Request, res: Response) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ success: false, message: "Webhook is not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ success: false, message: "Missing Stripe signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ success: false, message: "Invalid Stripe signature" });
  }

  try {
    await handleEvent(event);
    return res.json({ received: true });
  } catch (error) {
    console.error(`Webhook ${event.type} failed:`, error);
    // A 500 tells Stripe to retry later.
    return res.status(500).json({ success: false, message: "Webhook handler failed" });
  }
}