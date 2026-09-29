export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://agrsolutionsllc.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, caseId, clientName, service, clientEmail } = req.body || {};
    const cents = Math.round(Number(amount) * 100);

    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured on the server.' });
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
    if (clientEmail) params.append('custom_fields[0][key]', 'case_reference');

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      return res.status(stripeRes.status).json({ error: data?.error?.message || 'Stripe error' });
    }

    return res.status(200).json({
      id: data.id,
      url: data.url,
      livemode: data.livemode
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected server error' });
  }
}
