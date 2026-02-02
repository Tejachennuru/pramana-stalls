

import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { stall_id, user_id, amount, full_name, phone, personal_mail } = await req.json()

        // 1. Validation
        if (!stall_id || !user_id || !amount || !full_name || !phone) {
            throw new Error('Missing required fields')
        }

        if (!personal_mail) {
            throw new Error('Email is required')
        }

        // Check Base Price
        const { data: stall, error: stallError } = await supabase
            .from('stalls')
            .select('base_price, category')
            .eq('id', stall_id)
            .single()

        if (stallError || !stall) throw new Error('Invalid stall')



        // 2. Insert Bid
        const { error: bidError } = await supabase
            .from('bids')
            .insert({
                stall_id,
                user_id,
                amount,
                full_name,
                phone,
                personal_mail
            })

        if (bidError) throw bidError


        // 3. Send Email (Resend API)
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (resendApiKey) {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: 'Pramana Auction <onboarding@resend.dev>', // Update this if you have a custom domain
                    to: [personal_mail],
                    subject: `Bid Placed: Stall #${stall_id}`,
                    html: `
            <h1>Bid Confirmed!</h1>
            <p><strong>Stall ID:</strong> ${stall_id}</p>
            <p><strong>Your Bid:</strong> ₹${amount}</p>
            <p>Good luck!</p>
          `
                })
            })

            if (!res.ok) {
                console.error('Failed to send email:', await res.text())
            }
        } else {
            console.log(`Mock Email to ${personal_mail}: Bid Placed for Stall ${stall_id} (Set RESEND_API_KEY to enable real emails)`)
        }

        return new Response(
            JSON.stringify({ message: 'Bid placed successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )


    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
