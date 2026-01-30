
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

        // 1. Verify Admin
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No authorization header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')
        if (user.email !== 'tejachennuru05@gmail.com') {
            throw new Error('Forbidden: Admin access only')
        }

        const { bid_id, stall_id } = await req.json()
        if (!bid_id || !stall_id) throw new Error('Missing bid_id or stall_id')

        // 2. Mark Winner
        const { error: updateError } = await supabase
            .from('bids')
            .update({ is_winner: true })
            .eq('id', bid_id)

        if (updateError) throw updateError

        // 3. Mark Losers (for this stall)
        await supabase
            .from('bids')
            .update({ is_winner: false })
            .eq('stall_id', stall_id)
            .neq('id', bid_id)

        // 4. Fetch Details for Emails
        const { data: winnerBid } = await supabase
            .from('bids')
            .select('*, stall:stalls(name)')
            .eq('id', bid_id)
            .single()

        const { data: losers } = await supabase
            .from('bids')
            .select('personal_mail, gitam_mail, stall:stalls(name)')
            .eq('stall_id', stall_id)
            .neq('id', bid_id)

        // 5. Send Emails
        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        // Winner Email
        if (winnerBid) {
            const email = winnerBid.personal_mail || winnerBid.gitam_mail
            if (email) {
                await sendEmail(resendApiKey, email,
                    `Congratulations! You are selected for Stall: ${winnerBid.stall.name}`,
                    `<h1>You are selected!</h1>
                     <p>We are happy to inform you that your bid for <strong>${winnerBid.stall.name}</strong> has been selected.</p>
                     <p>The team will contact you shortly for further proceedings.</p>`
                )
            }
        }

        // Loser Emails
        if (losers && losers.length > 0) {
            // Send individually to avoid exposing emails to each other
            for (const loser of losers) {
                const email = loser.personal_mail || loser.gitam_mail
                if (email) {
                    await sendEmail(resendApiKey, email,
                        `Update on Stall: ${loser.stall.name}`,
                        `<p>Thank you for your interest.</p>
                         <p>Sorry, better luck next time. Your bid for <strong>${loser.stall.name}</strong> was not selected.</p>`
                    )
                }
            }
        }

        return new Response(
            JSON.stringify({ message: 'Winner confirmed and emails sent' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

async function sendEmail(apiKey, to, subject, html) {
    if (!apiKey) {
        console.log(`[Mock Email] To: ${to} | Subject: ${subject}`)
        return
    }

    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'Pramana Stalls <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: html
            })
        })
    } catch (e) {
        console.error('Email send failed', e)
    }
}
