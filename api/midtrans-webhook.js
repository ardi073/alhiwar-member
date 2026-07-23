import { createClient } from '@supabase/supabase-js';

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
        const { transaction_status, custom_field1, order_id } = payload;
        
        // custom_field1 berisi userId Supabase yang kita kirim saat membuat token
        const userId = custom_field1;

        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            // Pembayaran Berhasil!
            if (!userId) {
                return new Response(JSON.stringify({ error: 'UserID tidak ditemukan di custom_field1' }), { status: 400 });
            }

            // Inisialisasi Supabase menggunakan Service Role Key (Bypass RLS)
            const supabaseUrl = 'https://cjwufugmuhzbvmbixjyx.supabase.co';
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseServiceKey) {
                return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY belum disetel di Vercel' }), { status: 500 });
            }

            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // Update status premium di database
            const { error } = await supabase
                .from('users_premium')
                .update({ 
                    is_premium: true,
                    subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Aktif 30 Hari
                })
                .eq('id', userId);

            if (error) {
                console.error("Gagal update Supabase:", error);
                return new Response(JSON.stringify({ error: 'Gagal update database' }), { status: 500 });
            }

            return new Response(JSON.stringify({ status: 'success', message: 'Akun berhasil diupgrade ke Premium' }), { status: 200 });
        }

        return new Response(JSON.stringify({ status: 'ignored', message: `Status transaksi: ${transaction_status}` }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
