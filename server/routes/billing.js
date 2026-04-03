const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe = null;
if (STRIPE_SECRET) {
  stripe = require('stripe')(STRIPE_SECRET);
}

const PLANS = {
  solo: { name: 'Solo Agent', priceMonthly: 2900, priceYearly: 29000 },
  team: { name: 'Team', priceMonthly: 7900, priceYearly: 79000 }
};

// GET /api/billing/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data: team } = await getSupabase()
      .from('teams')
      .select('plan, account_type, trial_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', req.user.teamId)
      .single();

    if (!team) return res.status(404).json({ error: 'Team not found' });

    let subscription = null;
    if (stripe && team.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(team.stripe_subscription_id);
      } catch (e) {}
    }

    const isTrialExpired = team.plan === 'trial' && new Date(team.trial_ends_at) < new Date();

    res.json({
      plan: team.plan,
      accountType: team.account_type,
      trialEndsAt: team.trial_ends_at,
      isTrialExpired,
      hasStripe: !!team.stripe_subscription_id,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      } : null
    });
  } catch (err) {
    console.error('Billing status error:', err);
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

// POST /api/billing/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Billing is not configured yet. Please contact support.' });
  }

  try {
    const { plan, interval } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    const amount = interval === 'yearly' ? planConfig.priceYearly : planConfig.priceMonthly;
    const intervalStr = interval === 'yearly' ? 'year' : 'month';

    const { data: team } = await getSupabase()
      .from('teams')
      .select('stripe_customer_id, name')
      .eq('id', req.user.teamId)
      .single();

    let customerId = team?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { teamId: req.user.teamId, username: req.user.username }
      });
      customerId = customer.id;
      await getSupabase()
        .from('teams')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.user.teamId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: planConfig.name + ' Plan' },
          unit_amount: amount,
          recurring: { interval: intervalStr }
        },
        quantity: 1
      }],
      success_url: req.headers.origin + '/dashboard.html?billing=success',
      cancel_url: req.headers.origin + '/dashboard.html?billing=cancelled',
      metadata: { teamId: req.user.teamId, plan: plan }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Create checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/portal
router.post('/portal', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Billing is not configured yet' });
  }

  try {
    const { data: team } = await getSupabase()
      .from('teams')
      .select('stripe_customer_id')
      .eq('id', req.user.teamId)
      .single();

    if (!team?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripe_customer_id,
      return_url: req.headers.origin + '/admin-settings.html'
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal session error:', err);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// POST /api/billing/webhook — Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Webhooks not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const teamId = session.metadata?.teamId;
        const plan = session.metadata?.plan || 'solo';
        if (teamId && session.subscription) {
          await getSupabase()
            .from('teams')
            .update({
              plan: plan,
              stripe_subscription_id: session.subscription,
              account_type: 'paid'
            })
            .eq('id', teamId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: teams } = await getSupabase()
          .from('teams')
          .select('id')
          .eq('stripe_subscription_id', sub.id);
        if (teams && teams.length > 0) {
          await getSupabase()
            .from('teams')
            .update({ plan: 'trial', stripe_subscription_id: null })
            .eq('id', teams[0].id);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
