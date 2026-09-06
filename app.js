const CONFIG = {
  // Вставьте URL webhook (например, n8n/Make/Formspree) для реальной отправки.
  // Если оставить пустым, итог будет скачиваться JSON-файлом.
  webhookUrl: "https://n8n-artemzhzhenov.xyz/webhook/voronin-brief-a7x2",
  projectName: "VORONIN Client Brief",
  storageKey: "voronin_client_brief_v1"
};

const stepNames = [
  "Компания",
  "Ассортимент",
  "Коммерция",
  "Производство и доставка",
  "Клиенты и продажи",
  "Примеры для AI",
  "Правила и материалы"
];

const form = document.getElementById("briefForm");
const steps = [...document.querySelectorAll(".form-step")];
const nav = document.getElementById("stepsNav");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const mobileProgressFill = document.getElementById("mobileProgressFill");
const mobileProgressText = document.getElementById("mobileProgressText");
const mobileStepName = document.getElementById("mobileStepName");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const exportBtn = document.getElementById("exportBtn");
const productsList = document.getElementById("productsList");
const addProductBtn = document.getElementById("addProductBtn");
const attachments = document.getElementById("attachments");
const filesList = document.getElementById("filesList");
const toast = document.getElementById("toast");
const successModal = document.getElementById("successModal");
const successText = document.getElementById("successText");
const closeModalBtn = document.getElementById("closeModalBtn");
const downloadFinalBtn = document.getElementById("downloadFinalBtn");

let currentStep = 0;
let productCounter = 0;
let lastPayload = null;
let submitted = false;

stepNames.forEach((name, i) => {
  const item = document.createElement("div");
  item.className = "step-nav";
  item.innerHTML = `<span class="step-index">${i + 1}</span><span>${name}</span>`;
  item.addEventListener("click", () => {
    if (i <= currentStep || validateStep(currentStep, false)) showStep(i);
  });
  nav.appendChild(item);
});

function showStep(index) {
  currentStep = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((s, i) => s.classList.toggle("active", i === currentStep));
  [...nav.children].forEach((n, i) => n.classList.toggle("active", i === currentStep));
  const pct = ((currentStep + 1) / steps.length) * 100;
  progressFill.style.width = `${pct}%`;
  mobileProgressFill.style.width = `${pct}%`;
  progressText.textContent = `${currentStep + 1} / ${steps.length}`;
  mobileProgressText.textContent = `${currentStep + 1} / ${steps.length}`;
  mobileStepName.textContent = stepNames[currentStep];
  prevBtn.style.visibility = currentStep === 0 ? "hidden" : "visible";
  nextBtn.classList.toggle("hidden", currentStep === steps.length - 1);
  submitBtn.classList.toggle("hidden", currentStep !== steps.length - 1);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep(index, showErrors = true) {
  const required = [...steps[index].querySelectorAll("[required]")];
  let firstInvalid = null;
  required.forEach(el => {
    const invalid = el.type === "checkbox" ? !el.checked : !String(el.value || "").trim();
    el.style.borderColor = invalid ? "rgba(255,138,138,.65)" : "";
    if (invalid && !firstInvalid) firstInvalid = el;
  });
  if (firstInvalid && showErrors) {
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    notify("Заполните обязательные поля этого шага");
  }
  return !firstInvalid;
}

nextBtn.addEventListener("click", () => {
  if (validateStep(currentStep)) showStep(currentStep + 1);
});
prevBtn.addEventListener("click", () => showStep(currentStep - 1));

function addProduct(data = {}) {
  productCounter += 1;
  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.productId = productCounter;
  card.innerHTML = `
    <div class="product-card-head"><strong>Товар / группа №${productCounter}</strong><button type="button" class="remove-product" title="Удалить">×</button></div>
    <div class="product-grid">
      <input data-product-field="name" placeholder="Название / группа" value="${escapeHtml(data.name || "")}">
      <input data-product-field="size" placeholder="Размер / формат" value="${escapeHtml(data.size || "")}">
      <input data-product-field="specs" placeholder="Плотность / слои / характеристики" value="${escapeHtml(data.specs || "")}">
    </div>`;
  card.querySelector(".remove-product").addEventListener("click", () => { card.remove(); saveDraft(); });
  card.querySelectorAll("input").forEach(input => input.addEventListener("input", saveDraft));
  productsList.appendChild(card);
}

addProductBtn.addEventListener("click", () => addProduct());

function getProducts() {
  return [...productsList.querySelectorAll(".product-card")].map(card => {
    const o = {};
    card.querySelectorAll("[data-product-field]").forEach(i => o[i.dataset.productField] = i.value.trim());
    return o;
  }).filter(p => Object.values(p).some(Boolean));
}

function serializeForm() {
  const data = {};
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) {
    if (key === "safe_ai") {
      data.safe_ai ||= [];
      data.safe_ai.push(value);
    } else if (!(value instanceof File)) {
      data[key] = value;
    }
  }
  data.products = getProducts();
  data.attachments = [...attachments.files].map(f => ({ name: f.name, size: f.size, type: f.type }));
  data.meta = {
    project: CONFIG.projectName,
    submitted_at: new Date().toISOString(),
    source: "github-pages-form"
  };
  return data;
}

function saveDraft() {
  const data = serializeForm();
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  const state = document.getElementById("draftState");
  state.innerHTML = '<span class="dot"></span> Сохранено';
  clearTimeout(saveDraft.t);
  saveDraft.t = setTimeout(() => state.innerHTML = '<span class="dot"></span> Черновик сохраняется автоматически', 1200);
}

function loadDraft() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  if (!raw) { addProduct(); return; }
  try {
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([key, value]) => {
      if (["products","attachments","meta","safe_ai"].includes(key)) return;
      const els = [...form.querySelectorAll(`[name="${CSS.escape(key)}"]`)];
      els.forEach(el => {
        if (el.type === "radio") el.checked = el.value === value;
        else if (el.type === "checkbox") el.checked = Boolean(value);
        else el.value = value ?? "";
      });
    });
    [...form.querySelectorAll('[name="safe_ai"]')].forEach(cb => cb.checked = (data.safe_ai || []).includes(cb.value));
    if (Array.isArray(data.products) && data.products.length) data.products.forEach(addProduct); else addProduct();
    updateLineCounts();
  } catch { addProduct(); }
}

form.addEventListener("input", () => { saveDraft(); updateLineCounts(); });
form.addEventListener("change", saveDraft);

function updateLineCounts() {
  [["positive_examples","positiveCount"],["negative_examples","negativeCount"]].forEach(([name,id]) => {
    const v = form.elements[name]?.value || "";
    const count = v.split(/\n+/).map(s => s.trim()).filter(Boolean).length;
    document.getElementById(id).textContent = `${count} строк`;
  });
}

attachments.addEventListener("change", () => {
  filesList.innerHTML = [...attachments.files].map(f => `<span class="file-chip">${escapeHtml(f.name)}</span>`).join("");
  saveDraft();
});

function downloadJson(data, filename = "voronin-client-brief.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", () => {
  downloadJson(serializeForm(), "voronin-brief-draft.json");
  notify("Черновик скачан");
});

downloadFinalBtn.addEventListener("click", () => lastPayload && downloadJson(lastPayload));

form.addEventListener("submit", async e => {
  e.preventDefault();
  // Повторная отправка уже принятого брифа создаёт дубль на приёмной стороне.
  if (submitted) return;
  if (!validateStep(currentStep)) return;
  const payload = serializeForm();
  lastPayload = payload;
  submitBtn.disabled = true;
  submitBtn.textContent = "Отправляем...";

  try {
    if (CONFIG.webhookUrl) {
      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      [...attachments.files].forEach(file => fd.append("files", file, file.name));
      const res = await fetch(CONFIG.webhookUrl, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      successText.textContent = "Спасибо. Ответы и материалы отправлены команде проекта «Воронин».";
    } else {
      downloadJson(payload);
      successText.textContent = "Ответы собраны и скачаны в JSON. Чтобы отправлять их автоматически, укажите webhookUrl в app.js.";
    }
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
    submitted = true;
    successModal.classList.remove("hidden");
  } catch (err) {
    notify("Не удалось отправить. Скачиваем резервную копию.");
    downloadJson(payload);
  } finally {
    if (submitted) {
      // Кнопка остаётся заблокированной: бриф уже принят.
      submitBtn.textContent = "Отправлено";
      exportBtn.textContent = "Скачать копию ответов";
    } else {
      // Отправка не удалась — даём попробовать ещё раз.
      submitBtn.disabled = false;
      submitBtn.textContent = "Завершить и отправить";
    }
  }
});

closeModalBtn.addEventListener("click", () => successModal.classList.add("hidden"));

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.t);
  notify.t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

loadDraft();
showStep(0);
