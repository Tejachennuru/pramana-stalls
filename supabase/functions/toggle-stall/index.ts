
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization Header')

        // 1. Verify User (using User's JWT)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) throw new Error('Unauthorized')

        // 2. Strict Check for Super Admin
        const SUPER_ADMIN = 'tejachennuru05@gmail.com'
        if (user.email !== SUPER_ADMIN) {
            return new Response(JSON.stringify({ error: 'Forbidden: Super Admin Only' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403
            })
        }

        const { stall_id, action } = await req.json() // action: 'activate' | 'deactivate'

        if (!stall_id) throw new Error('Missing stall_id')

        const is_active = (action === 'activate')

        // 3. Update Stall (using Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { error: updateError } = await supabaseAdmin
            .from('stalls')
            .update({ is_active: is_active })
            .eq('id', stall_id)

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ message: `Stall ${stall_id} is now ${is_active ? 'Active' : 'Inactive'}`, is_active }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
