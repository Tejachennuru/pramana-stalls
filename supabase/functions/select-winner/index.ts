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
        const allowedAdmins = ['tejachennuru05@gmail.com', 'skmotaparthi@gmail.com', 'rkotha2@gitam.in', 'rkagula@gitam.in'];
        if (!allowedAdmins.includes(user.email)) {
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

        return new Response(
            JSON.stringify({ message: 'Winner updated in Database' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
