"use strict";

const ANSWERS = [
  "Так", "Ні", "Скоріше так", "Скоріше ні", "Безперечно",
  "Навряд чи", "Можливо", "Знаки кажуть «так»", "Дуже сумнівно",
  "Запитай пізніше", "Без жодних сумнівів", "Не розраховуй на це"
];
const MIN_LEN = 5;
const MAX_LEN = 100;
const SHAKE_MS = 1000;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  children.forEach(c => node.append(c));
  return node;
}

const style = el("style", {
  textContent: `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      background: #060a1f;
      color: #fff;
      font-family: "Segoe UI", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .app {
      width: min(100%, 560px);
      padding: clamp(16px, 4vw, 32px);
      border: 2px solid transparent;
      border-radius: 6px;
      background:
        linear-gradient(#060a1f, #060a1f) padding-box,
        linear-gradient(135deg, #00c8d7, #060a1f 45%, #7cff00) border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .question {
      width: 100%;
      padding: 12px 20px;
      font-size: clamp(16px, 4vw, 22px);
      text-align: center;
      color: #111;
      background: #efe0ff;
      border: 2px solid transparent;
      border-radius: 999px;
      outline: none;
    }
    .question:focus { border-color: #b36bff; }
    .question.invalid { border-color: #ff4d6d; }
    .error {
      min-height: 1.3em;
      margin: 0;
      font-size: 14px;
      color: #ff8fa3;
      text-align: center;
    }
    .ball {
      position: relative;
      width: min(100%, 440px);
      aspect-ratio: 1;
      border: 4px solid #0a0d22;
      border-radius: 50%;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow:
        0 0 30px 6px rgba(190, 110, 255, .55),
        inset 0 0 40px rgba(0, 0, 0, .6),
        inset 0 -20px 40px rgba(255, 255, 255, .15);
      transition: transform .2s;
    }
    .ball:hover { transform: scale(1.02); }
    .ball:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
    .ball::after {
      content: "";
      position: absolute;
      inset: 4% 8% auto 8%;
      height: 35%;
      border-radius: 50%;
      background: linear-gradient(rgba(255,255,255,.35), transparent);
      pointer-events: none;
    }
    .answer {
      position: relative;
      z-index: 1;
      display: block;
      max-width: 72%;
      text-align: center;
      font-size: clamp(22px, 6vw, 34px);
      font-weight: 600;
      line-height: 1.2;
      text-shadow: 0 0 4px #7a2bd6, 0 0 8px #7a2bd6, 0 2px 2px #000;
      transition: opacity .4s;
    }
    .ball.shaking { animation: shake .15s infinite; }
    .ball.shaking .answer { opacity: 0; }
    @keyframes shake {
      0%   { transform: translate(0, 0) rotate(0); }
      25%  { transform: translate(-8px, 4px) rotate(-3deg); }
      50%  { transform: translate(8px, -4px) rotate(3deg); }
      75%  { transform: translate(-3px, -2px) rotate(-1deg); }
      100% { transform: translate(6px, 4px) rotate(2deg); }
    }
    .hint { margin: 0; font-size: 13px; color: #9aa3c7; text-align: center; }
    @media (prefers-reduced-motion: reduce) {
      .ball.shaking { animation: none; }
    }
  `
});
document.head.append(style);

const input = el("input", {
  className: "question",
  type: "text",
  placeholder: "Постав своє запитання…",
  maxLength: MAX_LEN,
  autocomplete: "off",
  ariaLabel: "Ваше запитання"
});
const error = el("p", { className: "error", role: "alert" });
const answer = el("span", { className: "answer", textContent: "?" });
const ball = el("button", { className: "ball", type: "button", ariaLabel: "Магічна куля — натисни, щоб отримати відповідь" }, [answer]);
const hint = el("p", { className: "hint", textContent: "Натисни на кулю або Enter, щоб отримати відповідь" });
const app = el("main", { className: "app" }, [input, error, ball, hint]);
document.body.append(app);

function validate(raw) {
  const q = raw.trim().replace(/\s+/g, " ");
  if (!q) return { ok: false, msg: "Введіть запитання." };
  if (q.length < MIN_LEN) return { ok: false, msg: `Запитання надто коротке (мінімум ${MIN_LEN} символів).` };
  if (q.length > MAX_LEN) return { ok: false, msg: `Запитання надто довге (максимум ${MAX_LEN} символів).` };
  if (!/[\p{L}]/u.test(q)) return { ok: false, msg: "Запитання має містити літери." };
  if (!q.endsWith("?")) return { ok: false, msg: "Запитання має закінчуватися знаком «?»." };
  return { ok: true, value: q };
}

function showError(msg) {
  error.textContent = msg;
  input.classList.toggle("invalid", Boolean(msg));
  input.setAttribute("aria-invalid", msg ? "true" : "false");
}

let busy = false;
let lastIndex = -1;

function randomAnswer() {
  let i;
  do { i = Math.floor(Math.random() * ANSWERS.length); } while (i === lastIndex);
  lastIndex = i;
  return ANSWERS[i];
}

function ask() {
  if (busy) return;
  const result = validate(input.value);
  if (!result.ok) {
    showError(result.msg);
    input.focus();
    return;
  }
  showError("");
  busy = true;
  ball.classList.add("shaking");
  setTimeout(() => {
    answer.textContent = randomAnswer();
    ball.classList.remove("shaking");
    busy = false;
  }, SHAKE_MS);
}

ball.addEventListener("click", ask);
input.addEventListener("keydown", e => { if (e.key === "Enter") ask(); });
input.addEventListener("input", () => { if (error.textContent) showError(""); });
