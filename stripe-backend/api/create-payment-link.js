export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://agrsolutionsllc.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, caseId, clientName, service, clientEmail, invoiceNumber } = req.body || {};
    const cents = Math.round(Number(amount) * 100);

    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe is not configured on the server.' });
    }

    // Production safety: never create client-facing payment links with a test key.
    const isLiveKey = stripeKey.startsWith('rk_live_') || stripeKey.startsWith('sk_live_');
    if (!isLiveKey) {
      return res.status(503).json({
        error: 'Live Stripe is not enabled yet. Configure STRIPE_SECRET_KEY with a live restricted key before accepting real payments.'
      });
    }

    const params = new URLSearchParams();
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(cents));
    params.append('line_items[0][price_data][product_data][name]', service || 'AGR Solutions LLC - Initial Payment');
    params.append('line_items[0][quantity]', '1');
    params.append('submit_type', 'pay');
    params.append('customer_creation', 'always');
    params.append('after_completion[type]', 'hosted_confirmation');
    params.append('after_completion[hosted_confirmation][custom_message]', 'Thank you. AGR Solutions LLC has received your payment.');
    params.append('metadata[case_id]', String(caseId || ''));
    params.append('metadata[client_name]', clientName || '');
    params.append('metadata[service]', service || '');
    params.append('metadata[invoice_number]', invoiceNumber || '');
    if (clientEmail) params.append('metadata[client_email]', clientEmail);

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      return res.status(stripeRes.status).json({ error: data?.error?.message || 'Stripe error' });
    }

    if (!data.livemode) {
      return res.status(502).json({ error: 'Stripe returned a test-mode payment link. No client link was issued.' });
    }

    return res.status(200).json({
      id: data.id,
      url: data.url,
      livemode: true
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
