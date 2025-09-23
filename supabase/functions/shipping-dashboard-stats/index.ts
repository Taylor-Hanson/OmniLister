import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

serve(async (req)=>{
  try {
    if (req.method !== 'GET') return json({error:'GET required'},405);
    
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    
    if (!orgId) return json({error:'orgId required'},400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get total shipments
    const { count: totalShipments } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    // Get pending shipments
    const { count: pendingShipments } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['created', 'label_generated']);

    // Get shipments shipped today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: shippedToday } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('shipped_at', today.toISOString());

    // Get total shipping cost
    const { data: costData } = await supabase
      .from('shipments')
      .select('cost_cents')
      .eq('org_id', orgId)
      .not('cost_cents', 'is', null);

    const totalShippingCost = costData?.reduce((sum, shipment) => sum + (shipment.cost_cents || 0), 0) || 0;
    const averageShippingCost = costData?.length ? Math.round(totalShippingCost / costData.length) : 0;

    // Get on-time delivery rate (simplified calculation)
    const { data: deliveredData } = await supabase
      .from('shipments')
      .select('delivered_at, shipped_at')
      .eq('org_id', orgId)
      .eq('status', 'delivered')
      .not('delivered_at', 'is', null)
      .not('shipped_at', 'is', null);

    let onTimeDeliveries = 0;
    if (deliveredData) {
      for (const shipment of deliveredData) {
        const shippedDate = new Date(shipment.shipped_at);
        const deliveredDate = new Date(shipment.delivered_at);
        const daysDiff = Math.ceil((deliveredDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24));
        // Assume 7 days is on-time for this calculation
        if (daysDiff <= 7) {
          onTimeDeliveries++;
        }
      }
    }

    const onTimeDeliveryRate = deliveredData?.length ? Math.round((onTimeDeliveries / deliveredData.length) * 100) : 0;

    const stats = {
      totalShipments: totalShipments || 0,
      pendingShipments: pendingShipments || 0,
      shippedToday: shippedToday || 0,
      totalShippingCost,
      averageShippingCost,
      onTimeDeliveryRate,
    };

    return json({ stats });

  } catch(e){ 
    return json({error:String(e)},500); 
  }
});