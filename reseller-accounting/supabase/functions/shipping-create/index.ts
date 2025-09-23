import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

type CreateShipmentRequest = {
  orgId: string;
  shipmentId: string;
  rateId: string;
  listingId?: string;
  marketplaceOrderId?: string;
  toAddress: {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  fromAddress: {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    value?: number;
    description?: string;
  }>;
  insurance?: boolean;
  signature?: boolean;
};

serve(async (req)=>{
  try {
    if (req.method !== 'POST') return json({error:'POST required'},405);
    
    const body = await req.json() as CreateShipmentRequest;
    const { orgId, shipmentId, rateId, listingId, marketplaceOrderId, toAddress, fromAddress, packages, insurance, signature } = body;

    if (!orgId || !shipmentId || !rateId || !toAddress || !fromAddress || !packages || packages.length === 0) {
      return json({error:'orgId, shipmentId, rateId, toAddress, fromAddress, and packages required'},400);
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

    // Get the selected rate
    const { data: rate, error: rateError } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('shipment_id', shipmentId)
      .eq('id', rateId)
      .single();

    if (rateError || !rate) {
      return json({error:'Rate not found'},400);
    }

    // Create shipment with PirateShip
    const pirateshipRequest = {
      to: toAddress,
      from: fromAddress,
      packages,
      rateId: rateId,
      insurance: insurance || false,
      signature: signature || false,
    };

    const pirateshipResponse = await fetch(`${config.sandbox ? 'https://api.pirateship.com/v1' : 'https://api.pirateship.com/v1'}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pirateshipRequest),
    });

    if (!pirateshipResponse.ok) {
      const error = await pirateshipResponse.json().catch(() => ({}));
      return json({error:`PirateShip API Error: ${pirateshipResponse.status} - ${error.message || pirateshipResponse.statusText}`},500);
    }

    const pirateshipShipment = await pirateshipResponse.json();

    // Update shipment in database
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        pirateship_shipment_id: pirateshipShipment.id,
        tracking_number: pirateshipShipment.trackingNumber,
        carrier: pirateshipShipment.carrier,
        service_level: pirateshipShipment.serviceLevel,
        cost_cents: pirateshipShipment.cost ? Math.round(pirateshipShipment.cost * 100) : rate.rate_cents,
        label_url: pirateshipShipment.labelUrl,
        status: 'label_generated',
        listing_id: listingId,
        marketplace_order_id: marketplaceOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (updateError) {
      return json({error:updateError.message},500);
    }

    return json({ 
      shipment: updatedShipment,
      pirateshipShipment,
      labelUrl: pirateshipShipment.labelUrl,
      trackingNumber: pirateshipShipment.trackingNumber,
    });

  } catch(e){ 
    return json({error:String(e)},500); 
  }
});
