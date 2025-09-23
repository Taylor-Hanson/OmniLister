import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

function json(d: unknown, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}})}

type AddressRequest = {
  orgId: string;
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
  isDefault?: boolean;
};

type AddressUpdate = {
  id: string;
  orgId: string;
  name?: string;
  company?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
};

serve(async (req)=>{
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (req.method === 'GET') {
      // Get addresses for org
      const url = new URL(req.url);
      const orgId = url.searchParams.get('orgId');
      
      if (!orgId) return json({error:'orgId required'},400);

      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('org_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return json({error:error.message},500);
      return json({ addresses: data || [] });

    } else if (req.method === 'POST') {
      // Create new address
      const body = await req.json() as AddressRequest;
      const { orgId, ...addressData } = body;

      if (!orgId || !addressData.name || !addressData.street1 || !addressData.city || !addressData.state || !addressData.zip) {
        return json({error:'orgId, name, street1, city, state, zip required'},400);
      }

      // If setting as default, unset other defaults
      if (addressData.isDefault) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('org_id', orgId);
      }

      const { data, error } = await supabase
        .from('shipping_addresses')
        .insert({
          org_id: orgId,
          ...addressData,
          country: addressData.country || 'US',
        })
        .select()
        .single();

      if (error) return json({error:error.message},500);
      return json({ address: data });

    } else if (req.method === 'PUT') {
      // Update address
      const body = await req.json() as AddressUpdate;
      const { id, orgId, ...updateData } = body;

      if (!id || !orgId) return json({error:'id and orgId required'},400);

      // If setting as default, unset other defaults
      if (updateData.isDefault) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('org_id', orgId);
      }

      const { data, error } = await supabase
        .from('shipping_addresses')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) return json({error:error.message},500);
      return json({ address: data });

    } else if (req.method === 'DELETE') {
      // Delete address
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      const orgId = url.searchParams.get('orgId');

      if (!id || !orgId) return json({error:'id and orgId required'},400);

      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return json({error:error.message},500);
      return json({ success: true });

    } else {
      return json({error:'Method not allowed'},405);
    }
  } catch(e){ 
    return json({error:String(e)},500); 
  }
});
