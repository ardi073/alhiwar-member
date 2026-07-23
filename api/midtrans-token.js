export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { userId, email } = body;

        if (!userId || !email) {
            return new Response(JSON.stringify({ error: 'Data user tidak lengkap' }), { status: 400 });
        }

        // Kunci Rahasia Midtrans Server (Menggunakan process.env dari Vercel)
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        
        if (!serverKey) {
            return new Response(JSON.stringify({ error: 'MIDTRANS_SERVER_KEY belum disetel di Vercel' }), { status: 500 });
        }
        
        const encodedKey = btoa(serverKey + ":");

        const orderId = `ALHIWAR-${userId}-${Date.now()}`;
        
        const payload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: 37000
            },
            customer_details: {
                email: email
            },
            item_details: [{
                id: "PREMIUM-1M",
                price: 37000,
                quantity: 1,
                name: "Al-Hiwar Premium (1 Bulan)"
            }],
            // Data tambahan untuk dikenali oleh webhook nanti
            custom_field1: userId
        };

        const response = await fetch('https://app.midtrans.com/snap/v1/transactions', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encodedKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            return new Response(JSON.stringify({ token: data.token, redirect_url: data.redirect_url }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: data.error_messages ? data.error_messages[0] : 'Gagal membuat transaksi' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
