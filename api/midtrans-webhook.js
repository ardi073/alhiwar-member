export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        const payload = await req.json();
        
        // Cek status transaksi dari Midtrans
        const { transaction_status, custom_field1 } = payload;
        
        // custom_field1 berisi userId Supabase yang kita kirim saat membuat token
        const userId = custom_field1;

        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            // Pembayaran Berhasil!
            if (!userId) {
                return new Response(JSON.stringify({ error: 'UserID tidak ditemukan di custom_field1' }), { status: 400 });
            }

            const supabaseUrl = 'https://cjwufugmuhzbvmbixjyx.supabase.co';
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseServiceKey) {
                return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY belum disetel di Vercel' }), { status: 500 });
            }

            // Update status premium menggunakan standar REST API (tanpa dependensi NPM)
            const updatePayload = {
                is_premium: true,
                subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Aktif 30 Hari
            };

            const response = await fetch(`${supabaseUrl}/rest/v1/users_premium?id=eq.${userId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updatePayload)
            });

            if (!response.ok) {
                const errData = await response.text();
                console.error("Gagal update Supabase:", errData);
                return new Response(JSON.stringify({ error: 'Gagal update database' }), { status: 500 });
            }

            return new Response(JSON.stringify({ status: 'success', message: 'Akun berhasil diupgrade ke Premium' }), { status: 200 });
        }

        return new Response(JSON.stringify({ status: 'ignored', message: `Status transaksi: ${transaction_status}` }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
