import { startSolicitation } from '../lib/sequra.js';

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
    const result = await startSolicitation({ order, customer, ipnUrl, returnUrl });
    const checkoutUrl = result?.order?.links?.checkout;

    if (checkoutUrl) {
      return res.status(200).json({ redirectUrl: checkoutUrl });
    }

    console.error('Respuesta Sequra sin URL:', JSON.stringify(result));
    return res.status(502).json({ error: 'Sequra no devolvió URL de checkout' });

  } catch (err) {
    console.error('Error init:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
