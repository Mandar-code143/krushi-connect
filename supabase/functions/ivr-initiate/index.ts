import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { workers, farmerName, jobTitle, jobDate, jobHours, jobLocation, jobBudget } = await req.json();

    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return new Response(JSON.stringify({ error: "workers array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignId = crypto.randomUUID();
    const results: any[] = [];

    // The TwiML webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/ivr-webhook`;

    for (const worker of workers) {
      // Insert call record
      const { data: callRecord, error: insertError } = await supabase
        .from("ivr_calls")
        .insert({
          worker_name: worker.name,
          worker_phone: worker.phone,
          farmer_name: farmerName,
          job_title: jobTitle,
          job_date: jobDate || "",
          job_hours: jobHours || "",
          job_location: jobLocation || "",
          job_budget: jobBudget || "",
          status: "calling",
          campaign_id: campaignId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        results.push({ worker: worker.name, error: insertError.message });
        continue;
      }

      // Format phone: ensure it starts with +91
      let phone = worker.phone.replace(/[^0-9]/g, "");
      if (phone.length === 10) phone = "91" + phone;
      if (!phone.startsWith("+")) phone = "+" + phone;

      // Build TwiML URL with query params for the webhook
      const twimlUrl = new URL(webhookUrl);
      twimlUrl.searchParams.set("call_id", callRecord.id);
      twimlUrl.searchParams.set("step", "language_menu");

      try {
        // Make Twilio API call
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
        const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const formData = new URLSearchParams();
        formData.append("To", phone);
        formData.append("From", TWILIO_PHONE_NUMBER);
        formData.append("Url", twimlUrl.toString());
        formData.append("StatusCallback", `${webhookUrl}?call_id=${callRecord.id}&step=status_callback`);
        formData.append("StatusCallbackEvent", "completed");
        formData.append("Timeout", "30");

        const twilioResp = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const twilioData = await twilioResp.json();

        if (twilioResp.ok) {
          // Update with call SID
          await supabase
            .from("ivr_calls")
            .update({ call_sid: twilioData.sid })
            .eq("id", callRecord.id);

          results.push({ worker: worker.name, status: "calling", callSid: twilioData.sid, callId: callRecord.id });
        } else {
          console.error("Twilio error:", twilioData);
          await supabase
            .from("ivr_calls")
            .update({ status: "failed" })
            .eq("id", callRecord.id);
          results.push({ worker: worker.name, status: "failed", error: twilioData.message });
        }
      } catch (callError) {
        console.error("Call error:", callError);
        await supabase
          .from("ivr_calls")
          .update({ status: "failed" })
          .eq("id", callRecord.id);
        results.push({ worker: worker.name, status: "failed", error: String(callError) });
      }
    }

    return new Response(JSON.stringify({ campaignId, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
