"use client";

import { useEffect, useState } from "react";
import { Check, Code2, Copy, X } from "lucide-react";

export function Github({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.08c-3.12.68-3.78-1.32-3.78-1.32-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.1-1.24-5.1-5.54 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.31-2.61 5.25-5.1 5.53.4.35.75 1.03.75 2.08v3.07c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
    </svg>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState("");
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => setState(""), 2000);
    return () => clearTimeout(timer);
  }, [state]);
  return (
    <button
      className="copy-button"
      aria-label={state || label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("Copied");
        } catch {
          setState("Copy failed");
        }
      }}
    >
      {state === "Copied" ? <Check size={14} /> : <Copy size={14} />}
      <span aria-live="polite">{state || label}</span>
    </button>
  );
}

function Highlight({ code }: { code: string }) {
  const pattern = /((?<!:)\/\/[^\n]*|"[^"\n]*"|'[^'\n]*'|`[^`]*`|\b(?:const|let|type|interface|function|return|if|else|true|false|undefined|null|unknown|any|string|number|boolean|async|await|new|import|from|export|readonly|void|declare)\b)/g;
  const keywords = /^(const|let|type|interface|function|return|if|else|true|false|undefined|null|unknown|any|string|number|boolean|async|await|new|import|from|export|readonly|void|declare)$/;
  return <>{code.split(pattern).map((token, index) => (
    <span key={index} className={token.startsWith("//") ? "token-comment" : /^["'`]/.test(token) ? "token-string" : keywords.test(token) ? "token-keyword" : undefined}>{token}</span>
  ))}</>;
}

export function CodeBlock({ code, label, kind }: { code: string; label: string; kind?: string }) {
  return (
    <div className={`code-block ${kind || ""}`}>
      <div className="code-bar">
        <span>{kind === "good" ? <Check size={14} /> : kind === "bad" ? <X size={14} /> : <Code2 size={14} />}{label}</span>
        <CopyButton text={code} />
      </div>
      <pre><code><Highlight code={code} /></code></pre>
    </div>
  );
}
