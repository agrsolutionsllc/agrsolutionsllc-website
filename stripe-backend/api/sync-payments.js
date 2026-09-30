export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://agrsolutionsllc.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { caseId, syncToken } = req.body || {};
    if (!caseId || !syncToken) {
      return res.status(400).json({ error: 'Missing case sync credentials' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe is not configured on the server.' });
    }

    const isLiveKey = stripeKey.startsWith('rk_live_') || stripeKey.startsWith('sk_live_');
    if (!isLiveKey) {
      return res.status(503).json({ error: 'Live Stripe is not enabled.' });
    }

    const safeCaseId = String(caseId).replace(/'/g, '');
    const safeToken = String(syncToken).replace(/'/g, '');
    const query = `metadata['case_id']:'${safeCaseId}' AND metadata['sync_token']:'${safeToken}' AND status:'succeeded'`;
    const url = new URL('https://api.stripe.com/v1/payment_intents/search');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', '100');

    const stripeRes = await fetch(url, {
      headers: { Authorization: 'Bearer ' + stripeKey }
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      return res.status(stripeRes.status).json({ error: data?.error?.message || 'Stripe error' });
    }

    const payments = (data.data || []).map(pi => ({
      id: pi.id,
      amount: Number(pi.amount_received || pi.amount || 0) / 100,
      currency: pi.currency || 'usd',
      created: pi.created || null,
      status: pi.status,
      invoiceNumber: pi.metadata?.invoice_number || ''
    }));

    return res.status(200).json({ payments, livemode: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
