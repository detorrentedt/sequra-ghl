const BASE_URL = process.env.SEQURA_API_URL;

function cuotasToProduct(cuotasMax) {
  if (cuotasMax <= 2) return 'pp2';
  if (cuotasMax <= 3) return 'pp3';
  if (cuotasMax <= 4) return 'pp4';
  if (cuotasMax <= 6) return 'pp6';
  return 'pp12';
}

function getAuth() {
  return Buffer.from(
    `${process.env.SEQURA_USERNAME}:${process.env.SEQURA_PASSWORD}`
  ).toString('base64');
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
      delivery_method: { name: 'Digital', days: '0', provider: '' },
      platform: {
        name: 'custom', version: '1.0', uname: 'Linux',
        db_name: 'N/A', db_version: '0', php_version: 'node',
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
    headers: {
      'Authorization': `Basic ${getAuth()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('Sequra POST status:', res.status);
  if (!res.ok) throw new Error(`Sequra error ${res.status}: ${text}`);

  const location = res.headers.get('location');
  if (!location) throw new Error('Sequra no devolvió Location');
  const orderUrl = location.startsWith('http') ? location : `${BASE_URL}${location}`;
  console.log('Sequra orderUrl:', orderUrl);
  return { orderUrl };
}

export async function fetchForm(orderUrl, cuotasMax) {
  const product = cuotasToProduct(cuotasMax);
  const url = `${orderUrl}/form_v2?product=${product}&ajax=true`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${getAuth()}`,
      'Accept': 'text/html',
    },
  });
  const html = await res.text();
  console.log('Sequra form status:', res.status, '| length:', html.length);
  if (!res.ok) throw new Error(`Sequra form error ${res.status}: ${html.substring(0, 200)}`);
  return html;
}

export async function confirmOrder(orderRef) {
  const res = await fetch(`${BASE_URL}/orders/${orderRef}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${getAuth()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order: { state: 'confirmed' } }),
  });
  return res.ok;
}
