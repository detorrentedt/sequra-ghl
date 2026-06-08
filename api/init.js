import { startSolicitation, fetchForm } from '../lib/sequra.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { order, customer } = req.body;
  if (!order?.total || !customer?.email) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  const baseUrl = `https://${req.headers.host}`;
  const ipnUrl = `${baseUrl}/api/ipn`;
  const returnUrl = `${baseUrl}/api/return?orderId=${order.id}`;
  try {
    const { orderUrl } = await startSolicitation({ order, customer, ipnUrl, returnUrl });
    const formHtml = await fetchForm(orderUrl, order.cuotasMax || 12, returnUrl);
    return res.status(200).json({ formHtml });
  } catch (err) {
    console.error('Error init:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
