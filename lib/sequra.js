const BASE_URL = process.env.SEQURA_API_URL;

function cuotasToProduct(cuotasMax) {
  if (cuotasMax <= 2) return 'pp2';
  if (cuotasMax <= 3) return 'pp3';
  if (cuotasMax <= 4) return 'pp4';
  if (cuotasMax <= 6) return 'pp6';
  return 'pp12';
}

function getHeaders() {
  const auth = Buffer.from(
    `${process.env.SEQURA_USERNAME}:${process.env.SEQURA_PASSWORD}`
  ).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

export async function startSolicitation({ order, customer, ipnUrl, returnUrl }) {
  const address = {
    company: '',
    address_line_1: customer.address,
    address_line_2: '',
    postal_code: customer.postalCode,
    city: customer.city,
    country_code: 'ES',
    given_names: customer.firstName,
    surnames: customer.lastName,
    phone: customer.phone,
  };

  const body = {
    order: {
      state: 'solicitation_ready',
      merchant: { id: process.env.SEQURA_MERCHANT },
      cart: {
        currency: 'EUR',
        gift: false,
        order_total_with_tax: order.total,
        items: order.items.map(item => ({
          type: 'product',
          reference: item.id,
          name: item.name,
          price_with_tax: item.price,
          total_with_tax: item.price * item.quantity,
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
        logged_in: false,
        language_code: 'es',
      },
      delivery_address: address,
      invoice_address: address,
      delivery_method: {
        name: 'Digital',
        days: '0',
        provider: '',
      },
      platform: {
        name: 'custom',
        version: '1.0',
        uname: 'Linux',
        db_name: 'N/A',
        db_version: '0',
        php_version: 'node',
      },
      gui: {
        layout: 'desktop',
        initial_payment_method: cuotasToProduct(order.cuotasMax || 12),
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

  const text = await res.text();
  console.log('Sequra status:', res.status, '| body:', text.substring(0, 300));

  if (!res.ok) {
    throw new Error(`Sequra error ${res.status}: ${text}`);
  }

if (!text || text.trim() === '') {
    const location = res.headers.get('location');
    console.log('Sequra Location:', location);
    if (!location) throw new Error('Sequra devolvió respuesta vacía sin Location');
    const fullUrl = location.startsWith('http') ? location : `${BASE_URL}${location}`;
    
    const orderRes = await fetch(fullUrl, {
      headers: { ...getHeaders(), 'Accept': 'application/json' },
    });
    const orderText = await orderRes.text();
    console.log('Sequra GET status:', orderRes.status, '| body:', orderText.substring(0, 500));
    if (!orderRes.ok) throw new Error(`Sequra GET error ${orderRes.status}: ${orderText}`);
    return JSON.parse(orderText);
  }

  return JSON.parse(text);
}

export async function confirmOrder(orderRef) {
  const res = await fetch(`${BASE_URL}/orders/${orderRef}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ order: { state: 'confirmed' } }),
  });
  return res.ok;
}
