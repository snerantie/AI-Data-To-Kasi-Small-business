import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Send, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
import type { Screen } from "../App";
import { formatRand, kasiScore, sumSalesToday, useStore } from "../store";
import { parseSale } from "../voice";

type Msg =
  | { id: string; from: "bot" | "user"; text: string; time: string }
  | { id: string; from: "typing" };

const nowStr = () =>
  new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

export function WhatsAppBot({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, addSale } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef(false);

  // Auto-play the intro convo once on mount.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    const steps: (() => void)[] = [
      () =>
        setMessages([
          {
            id: "b0",
            from: "bot",
            text: tr("whatsappSampleBotWelcome", lang),
            time: nowStr(),
          },
        ]),
      () =>
        setMessages((m) => [
          ...m,
          { id: "u1", from: "user", text: tr("whatsappSampleUser1", lang), time: nowStr() },
        ]),
      () => setMessages((m) => [...m, { id: "t1", from: "typing" }]),
      () =>
        setMessages((m) => [
          ...m.filter((x) => x.from !== "typing"),
          { id: "b1", from: "bot", text: tr("whatsappSampleBot1", lang), time: nowStr() },
        ]),
      () =>
        setMessages((m) => [
          ...m,
          { id: "u2", from: "user", text: tr("whatsappSampleUser2", lang), time: nowStr() },
        ]),
      () => setMessages((m) => [...m, { id: "t2", from: "typing" }]),
      () =>
        setMessages((m) => [
          ...m.filter((x) => x.from !== "typing"),
          { id: "b2", from: "bot", text: tr("whatsappSampleBot2", lang), time: nowStr() },
        ]),
    ];

    const delays = [400, 1400, 800, 1600, 1600, 900, 1500];
    let acc = 0;
    const timers: number[] = [];
    for (let i = 0; i < steps.length; i++) {
      acc += delays[i];
      timers.push(window.setTimeout(steps[i], acc));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [lang]);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const respondToUser = (text: string) => {
    const parsed = parseSale(text);
    const lowered = text.trim().toLowerCase();

    // Simulate typing then reply
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "typing" }]);

    window.setTimeout(() => {
      let botText = tr("whatsappFallbackReply", lang);

      if (parsed && parsed.confidence !== "low") {
        addSale({
          item: parsed.item,
          qty: parsed.qty,
          price: parsed.price,
          raw: text,
          source: "voice",
        });
        botText = trParams("whatsappSaleReply", lang, {
          qty: parsed.qty,
          item: parsed.item,
          price: parsed.price,
          total: parsed.qty * parsed.price,
        });
      } else if (lowered.includes("score") || lowered.includes("scor")) {
        const score = kasiScore(state);
        botText =
          lang === "en"
            ? `Your KasiScore right now: ${score} ${score >= 700 ? "🔥 You're eligible for micro-credit." : "— keep logging sales to climb."}`
            : lang === "zu"
              ? `I-KasiScore yakho manje: ${score}. ${score >= 700 ? "🔥 Ufaneleka isikweletu esincane." : "— qhubeka ngokungenisa."}`
              : `KasiScore ea hao hona joale: ${score}. ${score >= 700 ? "🔥 U tšoaneleha micro-credit." : "— tsoela pele u ngole."}`;
      } else if (lowered.includes("total") || lowered.includes("today")) {
        botText =
          lang === "en"
            ? `Today's takings: ${formatRand(sumSalesToday(state.sales))}.`
            : lang === "zu"
              ? `Imali yanamuhla: ${formatRand(sumSalesToday(state.sales))}.`
              : `Chelete ea kajeno: ${formatRand(sumSalesToday(state.sales))}.`;
      }

      setMessages((m) => [
        ...m.filter((x) => x.from !== "typing"),
        {
          id: crypto.randomUUID(),
          from: "bot",
          text: botText,
          time: nowStr(),
        },
      ]);
    }, 900);
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "user", text, time: nowStr() },
    ]);
    setInput("");
    respondToUser(text);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b141a]">
      {/* WhatsApp-style header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-white/5">
        <button
          onClick={() => onNavigate("home")}
          className="p-1 -ml-1 text-white/80"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-display font-bold text-bg">
          K
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{tr("whatsappTitle", lang)}</div>
          <div className="text-[11px] text-emerald-400">
            {tr("whatsappSub", lang)}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        style={{
          background:
            "radial-gradient(600px 400px at 100% 0%, rgba(20,60,40,0.35), transparent 60%), #0b141a",
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) =>
            m.from === "typing" ? (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#202c33] px-3 py-2"
              >
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <Dot delay={0} />
                  <Dot delay={0.15} />
                  <Dot delay={0.3} />
                  <span className="ml-1">
                    {tr("whatsappTypingIndicator", lang)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={
                  "max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-snug " +
                  (m.from === "bot"
                    ? "bg-[#202c33] text-white rounded-tl-sm mr-auto"
                    : "bg-[#005c4b] text-white rounded-tr-sm ml-auto")
                }
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div
                  className={
                    "text-[10px] mt-1 flex items-center justify-end gap-0.5 " +
                    (m.from === "bot" ? "text-white/40" : "text-emerald-100/70")
                  }
                >
                  {m.time}
                  {m.from === "user" && <CheckCheck size={12} />}
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 bg-[#202c33] border-t border-white/5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={tr("whatsappTypeHere", lang)}
          className="flex-1 px-4 py-3 rounded-full bg-[#2a3942] text-white text-sm placeholder-white/40 outline-none focus:ring-1 focus:ring-emerald-500/40"
        />
        <button
          onClick={send}
          className="w-11 h-11 rounded-full bg-emerald-500 text-bg flex items-center justify-center shadow-lg"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.1, repeat: Infinity, delay }}
    />
  );
}
