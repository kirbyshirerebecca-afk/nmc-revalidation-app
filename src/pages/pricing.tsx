import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, ShieldCheck, FileText, Clock, Download, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRICE_ID = "price_1Tta9U1sRNutEgIHaDWF1LMQ";

const features = [
  { icon: Brain, text: "AI-powered reflection writer — paste rough notes, get a polished NMC-ready account" },
  { icon: FileText, text: "Unlimited CPD log entries with evidence tracking" },
  { icon: Clock, text: "Practice hours log across multiple employers and settings" },
  { icon: Download, text: "One-click export of your complete portfolio as a formatted PDF" },
  { icon: ShieldCheck, text: "Secure, private storage of all your revalidation records" },
  { icon: Sparkles, text: "Renewal date tracker so you never miss a deadline" },
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/stripe/checkout`.replace(/\/\//g, "/"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: PRICE_ID }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Upgrade to Pro</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to complete your NMC revalidation — stress-free.
        </p>
      </div>

      {/* Pricing card */}
      <div className="max-w-md">
        <div className="relative rounded-2xl border-2 border-primary bg-card overflow-hidden shadow-lg">
          {/* Top accent */}
          <div className="bg-primary px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">
                  NMC Pro
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-primary-foreground">£39.99</span>
                  <span className="text-primary-foreground/70 text-sm">/year</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  First month free
                </span>
              </div>
            </div>
          </div>

          {/* Trial callout */}
          <div className="bg-primary/5 border-b border-primary/10 px-6 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">30 days free</span> — no charge until your trial ends. Cancel any time.
            </p>
          </div>

          {/* Features list */}
          <div className="px-6 py-6 space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-1">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            <Button
              size="lg"
              className="w-full text-base gap-2 shadow-md"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecting to checkout…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Start free trial
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Secure checkout via Stripe · No card charged for 30 days
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="max-w-md space-y-4">
        <h2 className="text-base font-semibold text-foreground">Common questions</h2>
        {[
          {
            q: "When will I be charged?",
            a: "Not for 30 days. Your free trial starts today and your card is only charged when the trial ends.",
          },
          {
            q: "Can I cancel during the trial?",
            a: "Yes — cancel any time before day 30 and you won't be charged a penny.",
          },
          {
            q: "What happens to my data if I don't subscribe?",
            a: "Your data stays safe. You can still view (but not add new entries to) your CPD log, reflections, and practice hours.",
          },
          {
            q: "Is this recognised by the NMC?",
            a: "This app helps you organise and write up your revalidation evidence in the correct NMC format. Your confirmer still needs to sign the declaration as required by the NMC.",
          },
        ].map(({ q, a }) => (
          <div key={q} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{q}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
