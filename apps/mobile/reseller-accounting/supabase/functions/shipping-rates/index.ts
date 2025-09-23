import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

type RateRequest = {
  orgId: string;
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
  carrierAccounts?: string[];
  serviceLevels?: string[];
  insurance?: boolean;
  signature?: boolean;
};

serve(async (req)=>{
  try {
    if (req.method !== 'POST') return json({error:'POST required'},405);
    
    const body = await req.json() as RateRequest;
    const { orgId, toAddress, fromAddress, packages, carrierAccounts, serviceLevels, insurance, signature } = body;

    if (!orgId || !toAddress || !fromAddress || !packages || packages.length === 0) {
      return json({error:'orgId, toAddress, fromAddress, and packages required'},400);
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

    // Call PirateShip API for rates
    const pirateshipRequest = {
      to: toAddress,
      from: fromAddress,
      packages,
      carrierAccounts: carrierAccounts || [],
      serviceLevels: serviceLevels || [],
      insurance: insurance || false,
      signature: signature || false,
    };

    const pirateshipResponse = await fetch(`${config.sandbox ? 'https://api.pirateship.com/v1' : 'https://api.pirateship.com/v1'}/rates`, {
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

    const rates = await pirateshipResponse.json();

    // Store rates in database for caching
    const shipmentData = {
      org_id: orgId,
      to_address: toAddress,
      from_address: fromAddress,
      package_details: packages,
      status: 'rate_requested',
    };

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single();

    if (shipmentError) {
      return json({error:shipmentError.message},500);
    }

    // Store individual rates
    const rateInserts = rates.map((rate: any) => ({
      shipment_id: shipment.id,
      carrier: rate.carrier,
      service_level: rate.serviceLevel,
      rate_cents: Math.round(rate.rate * 100), // convert to cents
      estimated_days: rate.estimatedDays,
      rate_data: rate,
    }));

    const { error: ratesError } = await supabase
      .from('shipping_rates')
      .insert(rateInserts);

    if (ratesError) {
      console.error('Failed to store rates:', ratesError);
    }

    // Return formatted rates
    const formattedRates = rates.map((rate: any) => ({
      id: rate.id,
      carrier: rate.carrier,
      serviceLevel: rate.serviceLevel,
      rate: Math.round(rate.rate * 100), // cents
      estimatedDays: rate.estimatedDays,
      rateData: rate,
    }));

    return json({ 
      rates: formattedRates,
      shipmentId: shipment.id,
      request: pirateshipRequest,
    });

  } catch(e){ 
    return json({error:String(e)},500); 
  }
});
