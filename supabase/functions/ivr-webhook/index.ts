import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


export const supabase = createClient(supabaseUrl, supabaseKey)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    headers: { "Content-Type": "text/xml", ...corsHeaders },
  });
}

// Get the job message in the selected language
function getJobMessage(call: any, lang: string): string {
  const farmer = call.farmer_name;
  const job = call.job_title;
  const date = call.job_date;
  const hours = call.job_hours;
  const location = call.job_location;
  const budget = call.job_budget;

  if (lang === "mr") {
    return `किसानबंधू तर्फे नमस्कार!
${farmer} यांचा संदेश आहे.
त्यांना ${job} साठी कामगार हवेत.
दिनांक: ${date}, तास: ${hours}, ठिकाण: ${location}, बजेट: ${budget}.
कृपया पर्याय निवडा:
1 दाबा, स्वीकारायचे असल्यास.
2 दाबा, नकारायचे असल्यास.
3 दाबा, अनुपलब्ध असल्यास.`;
  } else if (lang === "hi") {
    return `किसानबंधू की ओर से नमस्कार!
${farmer} का संदेश है.
उन्हें ${job} के लिए कामगार चाहिए.
तारीख: ${date}, घंटे: ${hours}, स्थान: ${location}, बजट: ${budget}.
कृपया विकल्प चुनें:
1 दबाएं, स्वीकार करने के लिए.
2 दबाएं, अस्वीकार करने के लिए.
3 दबाएं, अनुपलब्ध होने पर.`;
  } else {
    return `Greetings from KisaanBandhu!
${farmer} has a message for you.
They need workers for ${job}.
Date: ${date}, Hours: ${hours}, Location: ${location}, Budget: ${budget}.
Please choose an option:
Press 1 to accept.
Press 2 to reject.
Press 3 if you are unavailable.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const callId = url.searchParams.get("call_id");
    const step = url.searchParams.get("step") || "language_menu";

    // Parse form data from Twilio (POST with application/x-www-form-urlencoded)
    let formData: Record<string, string> = {};
    if (req.method === "POST") {
      const body = await req.text();
      const params = new URLSearchParams(body);
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
    }

    const digits = formData["Digits"] || "";
    const callStatus = formData["CallStatus"] || "";

    // Handle status callback
    if (step === "status_callback") {
      if (callId && (callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed" || callStatus === "canceled")) {
        const statusMap: Record<string, string> = {
          "no-answer": "no_response",
          "busy": "no_response",
          "failed": "failed",
          "canceled": "failed",
        };
        await supabase
          .from("ivr_calls")
          .update({ status: statusMap[callStatus] || "failed", updated_at: new Date().toISOString() })
          .eq("id", callId);
      }
      return new Response("OK", { headers: corsHeaders });
    }

    if (!callId) {
      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Error. No call ID.</Say><Hangup/></Response>`);
    }

    // Update status to answered
    if (step === "language_menu") {
      await supabase
        .from("ivr_calls")
        .update({ status: "answered", updated_at: new Date().toISOString() })
        .eq("id", callId);
    }

    const webhookBase = `${SUPABASE_URL}/functions/v1/ivr-webhook`;

    // STEP 1: Language selection menu
    if (step === "language_menu") {
      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${webhookBase}?call_id=${callId}&amp;step=language_selected" timeout="10">
    <Say language="en-IN" voice="Polly.Aditi">To continue in English, press 1.</Say>
    <Pause length="1"/>
    <Say language="hi-IN" voice="Polly.Aditi">हिंदी में बात करने के लिए 2 दबाएं.</Say>
    <Pause length="1"/>
    <Say language="hi-IN" voice="Polly.Aditi">मराठीमध्ये बोलण्यासाठी 3 दाबा.</Say>
  </Gather>
  <Say language="en-IN" voice="Polly.Aditi">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    // STEP 2: Language selected, play job message
    if (step === "language_selected") {
      let lang = "en";
      if (digits === "2") lang = "hi";
      else if (digits === "3") lang = "mr";

      // Save language preference
      await supabase
        .from("ivr_calls")
        .update({ language_selected: lang, updated_at: new Date().toISOString() })
        .eq("id", callId);

      // Get call details
      const { data: call } = await supabase
        .from("ivr_calls")
        .select("*")
        .eq("id", callId)
        .single();

      if (!call) {
        return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Error. Call not found.</Say><Hangup/></Response>`);
      }

      const message = getJobMessage(call, lang);
      // Use hi-IN for both Hindi and Marathi (closest Twilio TTS voice)
      const ttsLang = lang === "en" ? "en-IN" : "hi-IN";

      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${webhookBase}?call_id=${callId}&amp;step=response_received&amp;${lang}" timeout="15">
    <Say language="${ttsLang}" voice="Polly.Aditi">${message}</Say>
  </Gather>
  <Say language="${ttsLang}" voice="Polly.Aditi">${lang === "mr" ? "कोणताही प्रतिसाद नाही. पुन्हा प्रयत्न करा." : lang === "hi" ? "कोई प्रतिक्रिया नहीं. कृपया पुनः प्रयास करें." : "No response received. Please try again."}</Say>
  <Hangup/>
</Response>`);
    }

    // STEP 3: Worker response received
    if (step === "response_received") {
      const lang = url.searchParams.get("lang") || "en";
      let status = "no_response";
      let responseMsg = "";

      if (digits === "1") {
        status = "accepted";
        responseMsg = lang === "mr" ? "धन्यवाद! तुम्ही काम स्वीकारले आहे. किसानबंधू तुम्हाला लवकरच संपर्क करेल." :
                      lang === "hi" ? "धन्यवाद! आपने काम स्वीकार किया है. किसानबंधू जल्द ही आपसे संपर्क करेगा." :
                      "Thank you! You have accepted the job. KisaanBandhu will contact you soon.";
      } else if (digits === "2") {
        status = "rejected";
        responseMsg = lang === "mr" ? "तुम्ही काम नाकारले आहे. धन्यवाद." :
                      lang === "hi" ? "आपने काम अस्वीकार किया है. धन्यवाद." :
                      "You have rejected the job. Thank you.";
      } else if (digits === "3") {
        status = "unavailable";
        responseMsg = lang === "mr" ? "तुम्ही अनुपलब्ध आहात असे नोंदवले आहे. धन्यवाद." :
                      lang === "hi" ? "आपने अनुपलब्ध होने की सूचना दी है. धन्यवाद." :
                      "You have been marked as unavailable. Thank you.";
      } else {
        responseMsg = lang === "mr" ? "अवैध पर्याय. धन्यवाद." :
                      lang === "hi" ? "अमान्य विकल्प. धन्यवाद." :
                      "Invalid option. Thank you.";
      }

      // Update call status
      await supabase
        .from("ivr_calls")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", callId);

      const ttsLang = lang === "en" ? "en-IN" : "hi-IN";

      return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${ttsLang}" voice="Polly.Aditi">${responseMsg}</Say>
  <Hangup/>
</Response>`);
    }

    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Goodbye.</Say><Hangup/></Response>`);
  } catch (err) {
    console.error("Webhook error:", err);
    return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>An error occurred. Please try again later.</Say><Hangup/></Response>`);
  }
});
