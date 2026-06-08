const BASE_URL = process.env.SEQURA_API_URL;

function getHeaders() {
  const auth = Buffer.from(
    `${process.env.SEQURA_USERNAME}:${process.env.SEQURA_PASSWORD}`
  ).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

// Paso 1: Inicia el pago fraccionado con Sequra
export async function startSolicitation({ order, customer, ipnUrl, returnUrl }) {
  const body = {
    order: {
      merchant: { id: process.env.SEQURA_MERCHANT },
      cart: {
        currency: 'EUR',
        gift: false,
        order_total_with_tax: order.total, // en céntimos: 10000 = 100€
        items: order.items.map(item => ({
          type: 'product',
          reference: item.id,
          name: item.name,
          price_with_tax: item.price,
          quantity: item.quantity,
          downloadable: true,
          perishable: false,
          restockable: false,
        })),
      },
      merchant_reference: { order_ref_1: order.id },
      customer: {
        given_names: customer.firstName,
        surnames: customer.lastName,
        email: customer.email,
        nin: customer.dni,
        date_of_birth: customer.dob,
        mobile_phone: customer.phone,
        ip_number: customer.ip,
        user_agent: customer.userAgent,
      },
      delivery_address: {
        given_names: customer.firstName,
        surnames: customer.lastName,
        address_line_1: customer.address,
        postal_code: customer.postalCode,
        city: customer.city,
        country_code: 'ES',
      },
      gui: {
        layout: 'desktop',
        // Forzar pago a 12 meses
        initial_payment_method: 'pp3',
      },
      return_url: returnUrl,
      notification_url: ipnUrl,
    }
  };

  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sequra error ${res.status}: ${err}`);
  }

  return res.json();
}

// Paso 3: Confirmar pedido tras recibir IPN de Sequra
export async function confirmOrder(orderRef) {
  const res = await fetch(`${BASE_URL}/orders/${orderRef}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ order: { state: 'confirmed' } }),
  });
  return res.ok;
}
