import { confirmOrder } from '../lib/sequra.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { merchant_reference, approved_since } = req.body || {};
  const orderRef = merchant_reference?.order_ref_1;

  if (!orderRef) {
    return res.status(400).json({ error: 'Sin referencia de pedido' });
  }

  if (!approved_since) {
    // Sequra rechazó el pago
    console.log('Pago rechazado por Sequra:', orderRef);
    return res.status(200).json({ ok: false, reason: 'rejected' });
  }

  try {
    const confirmed = await confirmOrder(orderRef);
    if (confirmed) {
      console.log('✅ Pedido confirmado:', orderRef);
      return res.status(200).json({ ok: true });
    }
    return res.status(500).json({ error: 'No se pudo confirmar' });
  } catch (err) {
    console.error('Error IPN:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
