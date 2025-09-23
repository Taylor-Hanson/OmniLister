import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status,s,headers:{'content-type':'application/json'}})}

type TrackRequest = {
  orgId: string;
  trackingNumber: string;
};

serve(async (req)=>{
  try {
    if (req.method !== 'POST') return json({error:'POST required'},405);
    
    const body = await req.json() as TrackRequest;
    const { orgId, trackingNumber } = body;

    if (!orgId || !trackingNumber) {
      return json({error:'orgId and trackingNumber required'},400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get PirateShip config for org
    const { data: config, error: configError } = await supabase
      .from('pirateship_config')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return json({error:'PirateShip not configured for this organization'},400);
    }

    // Track package with PirateShip
    const pirateshipResponse = await fetch(`${config.sandbox ? 'https://api.pirateship.com/v1' : 'https://api.pirateship.com/v1'}/tracking/${encodeURIComponent(trackingNumber)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Accept': 'application/json',
      },
    });

    if (!pirateshipResponse.ok) {
      const error = await pirateshipResponse.json().catch(() => ({}));
      return json({error:`PirateShip API Error: ${pirateshipResponse.status} - ${error.message || pirateshipResponse.statusText}`},500);
    }

    const trackingInfo = await pirateshipResponse.json();

    // Update shipment status in database
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('org_id', orgId)
      .eq('tracking_number', trackingNumber)
      .single();

    if (!shipmentError && shipment) {
      let newStatus = shipment.status;
      let shippedAt = shipment.shipped_at;
      let deliveredAt = shipment.delivered_at;

      // Update status based on tracking events
      if (trackingInfo.events && trackingInfo.events.length > 0) {
        const latestEvent = trackingInfo.events[0];
        
        if (latestEvent.status === 'delivered') {
          newStatus = 'delivered';
          deliveredAt = new Date(latestEvent.timestamp).toISOString();
        } else if (latestEvent.status === 'in_transit' || latestEvent.status === 'out_for_delivery') {
          newStatus = 'in_transit';
          if (!shippedAt) {
            shippedAt = new Date(latestEvent.timestamp).toISOString();
          }
        } else if (latestEvent.status === 'exception') {
          newStatus = 'exception';
        }
      }

      // Update shipment if status changed
      if (newStatus !== shipment.status || shippedAt !== shipment.shipped_at || deliveredAt !== shipment.delivered_at) {
        await supabase
          .from('shipments')
          .update({
            status: newStatus,
            shipped_at: shippedAt,
            delivered_at: deliveredAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);
      }
    }

    return json({ 
      trackingInfo,
      shipment: shipment || null,
    });

  } catch(e){ 
    return json({error:String(e)},500); 
  }
});
