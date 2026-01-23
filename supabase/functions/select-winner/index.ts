

import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"


serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get all stalls
        const { data: stalls } = await supabase.from('stalls').select('id')

        const winners = []

        for (const stall of stalls) {
            // 2. Find highest bid for each stall
            const { data: highestBid } = await supabase
                .from('bids')
                .select('*')
                .eq('stall_id', stall.id)
                .order('amount', { ascending: false })
                .limit(1)
                .single()

            if (highestBid) {
                // 3. Record Winner
                const { error } = await supabase
                    .from('winners')
                    .insert({
                        stall_id: stall.id,
                        user_id: highestBid.user_id,
                        winning_bid_id: highestBid.id
                    })

                if (!error) {
                    winners.push({ stall: stall.id, winner: highestBid.user_id })
                    // Trigger Email Notification here
                }
            }
        }

        return new Response(
            JSON.stringify({ message: 'Winners selected', winners }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
