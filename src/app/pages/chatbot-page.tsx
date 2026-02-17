import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Send, Bot, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED = [
  "Why is KakaoTalk suspicious?",
  "Why does Weather access location so much?",
  "Which apps should I be worried about?",
  "What should I do to protect my privacy?",
];

function getResponse(input: string): string {
  const q = input.toLowerCase();

  if (q.includes("kakaotalk") || q.includes("kakao")) {
    return `KakaoTalk was flagged as **suspicious** because it accessed three sensitive data categories — location, contacts, and photos — simultaneously within a 3-minute window (15:46–15:55).\n\nSpecifically:\n• 📍 Location queried twice\n• 👥 Contacts held open for ~2 minutes\n• 🖼️ Photos accessed via 3 separate identifiers\n\nThis multi-category burst is disproportionate to routine messaging activity and is a known pattern associated with aggressive data collection. Risk score: 7.9/10.\n\n**Recommendation:** Set KakaoTalk location to "While Using App" and limit photo access to "Selected Photos" only.`;
  }

  if (q.includes("weather")) {
    return `Apple Weather logged **17 location access intervals** over ~110 minutes (14:08–15:55 EST). While Apple Weather is a trusted first-party app, this polling rate exceeds what standard weather updates require.\n\nLikely causes:\n• Background refresh enabled\n• Live weather widgets on your home screen\n• Severe weather alert monitoring\n\nSeveral sessions lasted 2–3 minutes, suggesting active background processing. Risk score: 5.8/10.\n\n**Recommendation:** Set Weather location to "While Using App" and remove live weather widgets from your home screen.`;
  }

  if (
    q.includes("suspicious") ||
    q.includes("worried") ||
    q.includes("dangerous") ||
    q.includes("risk")
  ) {
    return `Based on the report, here's a summary by risk level:\n\n🔴 **High Risk (Suspicious)**\n• KakaoTalk — simultaneous access to location, contacts & photos (score: 7.9)\n\n🟡 **Medium Risk (Warning)**\n• Apple Weather — excessive location polling, 17 accesses over 110 min (score: 5.8)\n\n🟢 **Low Risk (Normal)**\n• Messages — standard contacts access for thread display (score: 2.4)\n• Mail — contacts access for autocomplete (score: 2.1)\n• Calendar — contacts for event attendees (score: 1.8)\n\nKakaoTalk is the only app requiring immediate action.`;
  }

  if (q.includes("location")) {
    return `Two apps accessed your location during this session:\n\n1. **KakaoTalk** — 2 location accesses within a 3-minute burst alongside contacts and photos. This is highly unusual for a messaging app.\n\n2. **Apple Weather** — 17 accesses over ~110 minutes. High frequency but consistent with weather widget behavior.\n\nLocation data is one of the most sensitive categories because it can reveal your home, workplace, and daily routine. Apps should only access it "While Using" — never "Always."\n\n**Tip:** Go to Settings → Privacy & Security → Location Services to review and restrict each app.`;
  }

  if (q.includes("contacts")) {
    return `Three apps accessed your contacts:\n\n• **KakaoTalk** — part of a suspicious multi-category burst\n• **Mail** — single 60-second session for autocomplete (normal)\n• **Messages** — two short sessions for loading thread avatars (normal)\n• **Calendar** — ~71 seconds for loading event attendees (normal)\n\nOnly KakaoTalk's contacts access is concerning because it happened simultaneously with location and photo access.`;
  }

  if (q.includes("photo")) {
    return `Photos were accessed only by **KakaoTalk**, via 3 separate identifiers within a 3-minute window:\n\n• Photos (ID 1): 15:47:00 – 15:48:47\n• Photos (ID 2): 15:47:02 – instant access\n• Photos (ID 3): 15:55:14 – ongoing at log end\n\nAccessing photos through multiple identifiers in quick succession is unusual and suggests the app may be scanning or indexing your library.\n\n**Recommendation:** Change KakaoTalk photo access to "Selected Photos" in Settings → Privacy & Security → Photos.`;
  }

  if (
    q.includes("recommend") ||
    q.includes("protect") ||
    q.includes("fix") ||
    q.includes("what should") ||
    q.includes("how to")
  ) {
    return `Here are the top actions to protect your privacy based on this report:\n\n1. **KakaoTalk** — Set location to "While Using", change photos to "Selected Photos"\n2. **Apple Weather** — Set location to "While Using", disable live widgets\n3. **Review all apps** — Go to Settings → Privacy & Security and audit each category\n4. **Enable App Privacy Report** — Keep monitoring which apps access what data\n\nThese changes can significantly reduce your exposure with minimal impact on app functionality.`;
  }

  if (q.includes("mail") || q.includes("email")) {
    return `Apple Mail accessed contacts once during the session (14:09:37 – 14:10:37, exactly 60 seconds). This is completely normal behavior — Mail reads your contacts to provide autocomplete suggestions when you compose a new email. Risk score: 2.1/10. No action needed.`;
  }

  if (q.includes("messages") || q.includes("sms")) {
    return `Apple Messages accessed contacts twice in quick succession (14:09:38 – 14:10:53). This is expected — Messages loads contact names and profile photos for your conversation threads. Both sessions ended cleanly. Risk score: 2.4/10. No action needed.`;
  }

  if (q.includes("calendar")) {
    return `Apple Calendar accessed contacts once (14:09:37 – 14:10:48, ~71 seconds). This is expected behavior for loading event attendees and syncing contact-linked calendar invitations. Risk score: 1.8/10. No action needed.`;
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return `Hi! I'm your Privacy Report Assistant. I can answer questions about the apps in your report — like why KakaoTalk was flagged, what the risk scores mean, or what steps you should take to protect your privacy. What would you like to know?`;
  }

  return `I can help you understand your privacy report. Try asking about:\n\n• A specific app (e.g. "Why is KakaoTalk suspicious?")\n• A data category (e.g. "Which apps accessed my location?")\n• Risk levels (e.g. "Which apps should I be worried about?")\n• Privacy tips (e.g. "What should I do to protect my privacy?")`;
}

export function ChatbotPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm your Privacy Report Assistant. Ask me anything about the apps in your report — why something was flagged, what the risk scores mean, or what you should do next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const reply = getResponse(text);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <p
          key={i}
          className={line === "" ? "mt-2" : ""}
          dangerouslySetInnerHTML={{ __html: bold }}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analysis")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analysis
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Privacy Assistant</div>
              <div className="text-xs text-green-600">Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-4 flex flex-col">
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "assistant"
                      ? "bg-blue-100"
                      : "bg-slate-200"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
                    msg.role === "assistant"
                      ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1.5 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your privacy report..."
            className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400 bg-transparent"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
