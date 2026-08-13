/* ============================================================
   情侣约会邀请 网页版 - 主逻辑
   流程：首页 → 信息分页 ×4 → 确认页 → 结尾页 + Web3Forms 回传
   ============================================================ */
(() => {
  "use strict";

  const app = document.getElementById("app");

  /* ---------- 应用状态 ---------- */
  const state = {
    view: "home",          // home | info | confirm | ending
    infoIndex: 0,          // 当前信息页下标
    responses: {},         // 按 pages[].title 保存她填写的内容
    choice: "",            // 最终选择：确认赴约 / 需要调整约会安排
    begIndex: 0,           // 哀求文案轮换计数
    startTime: formatNow(),
  };

  function formatNow() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  /* ---------- DOM 工具 ---------- */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const card = (...children) => {
    const c = el("div", "card");
    children.forEach((ch) => c.appendChild(ch));
    return c;
  };

  /* ---------- 渲染入口 ---------- */
  function render() {
    app.innerHTML = "";
    switch (state.view) {
      case "home":    renderHome(); break;
      case "info":    renderInfo(); break;
      case "confirm": renderConfirm(); break;
      case "ending":  renderEnding(); break;
    }
    window.scrollTo(0, 0);
  }

  /* ============================================================
     首页：是否愿意和我约会？
     ============================================================ */
  function renderHome() {
    const c = card(
      el("div", "info-icon", "💌"),
      el("h1", "big-title", CONFIG.home.title),
      el("p", "subtitle", CONFIG.home.subtitle),
    );

    const yesBtn = el("button", "btn btn-yes btn-yes-home", CONFIG.home.yes);
    yesBtn.addEventListener("click", () => {
      state.infoIndex = 0;
      state.view = "info";
      render();
    });
    c.appendChild(yesBtn);

    app.appendChild(c);

    // 「我不愿意」逃跑按钮：挂在 body 层，可自由移动
    const noBtn = el("button", "btn btn-no no-btn", CONFIG.home.no);
    noBtn.id = "noBtn";
    noBtn.addEventListener("click", () => {
      showBeg();          // 弹哀求气泡
      moveNoButton();     // 按钮逃跑
      state.begIndex += 1;
    });
    app.appendChild(noBtn);
    positionNoButton(true);
  }

  function positionNoButton(initial) {
    const b = document.getElementById("noBtn");
    if (!b) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const bw = b.offsetWidth || 122;
    const bh = b.offsetHeight || 44;
    let x, y;
    if (initial) {
      // 初始放在视口下方居中（卡片底部区域）
      x = (W - bw) / 2;
      y = Math.min(H * 0.72, H - bh - 30);
    } else {
      // 随机新位置，避开中央的「我愿意」按钮（约在屏幕中央偏上）
      for (let i = 0; i < 80; i++) {
        x = 16 + Math.random() * (W - bw - 32);
        y = 70 + Math.random() * (H - bh - 110);
        const cx = x + bw / 2, cy = y + bh / 2;
        const dx = cx - W / 2, dy = cy - H * 0.4;
        if (dx * dx + dy * dy < 165 * 165) continue;  // 离「是」按钮远一点
        break;
      }
    }
    b.style.left = x + "px";
    b.style.top = y + "px";
  }

  function moveNoButton() {
    positionNoButton(false);
  }

  function showBeg() {
    const text = CONFIG.beg_texts[state.begIndex % CONFIG.beg_texts.length];
    const pop = el("div", "beg-pop", text);
    const W = window.innerWidth;
    const bw = 260;
    pop.style.left = (10 + Math.random() * Math.max(10, W - bw - 20)) + "px";
    pop.style.top = (70 + Math.random() * Math.max(20, window.innerHeight - 220)) + "px";
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1400);
  }

  /* ============================================================
     信息分页：时间 / 地点 / 安排 / 用餐
     ============================================================ */
  function renderInfo() {
    const data = CONFIG.pages[state.infoIndex];
    const isMulti = !!data.multiline;

    const input = isMulti
      ? document.createElement("textarea")
      : document.createElement("input");
    input.className = "field" + (isMulti ? " field-multi" : "");
    input.placeholder = data.placeholder || "";

    // 回显已填内容
    const saved = (state.responses[data.title] || "").trim();
    if (saved) input.value = saved;

    // 底部按钮：上一页 / 下一页
    const row = el("div", "btn-row");
    if (state.infoIndex > 0) {
      const back = el("button", "btn btn-no", "← 上一页");
      back.addEventListener("click", () => saveAndNav(-1));
      row.appendChild(back);
    }
    const nextText = state.infoIndex < CONFIG.pages.length - 1 ? "下一页 →" : "下一步 →";
    const next = el("button", "btn btn-yes", nextText);
    next.addEventListener("click", () => saveAndNav(1));
    row.appendChild(next);

    const c = card(
      el("div", "info-icon", data.icon),
      el("h2", "page-title", data.title),
      el("p", "question", data.question),
      input,
      row,
    );
    app.appendChild(c);

    // 输入框下方小提示（可选）
    if (isMulti) input.style.marginTop = "22px";

    setTimeout(() => { try { input.focus(); } catch (_) {} }, 60);
  }

  function saveAndNav(dir) {
    const input = document.querySelector(".field");
    if (!input) return;
    const data = CONFIG.pages[state.infoIndex];
    const val = (input.value || "").trim();

    if (dir > 0 && !val) {
      showToast("这里也要填一下哦 ~");
      return;
    }
    if (val) state.responses[data.title] = val;

    if (dir < 0 && state.infoIndex === 0) {
      state.view = "home";
      render();
      return;
    }
    state.infoIndex += dir;
    if (state.infoIndex >= CONFIG.pages.length) {
      state.view = "confirm";
    }
    render();
  }

  /* ============================================================
     确认页
     ============================================================ */
  function renderConfirm() {
    const d = CONFIG.confirm;

    const list = el("div", "summary");
    CONFIG.pages.forEach((p) => {
      const val = (state.responses[p.title] || "").trim() || "（待填）";
      const item = el("div", "summary-item");
      item.appendChild(el("span", "summary-key", p.icon + " " + p.title + "："));
      item.appendChild(el("span", "summary-val", val));
      list.appendChild(item);
    });

    const yes = el("button", "btn btn-yes btn-wide", d.yes_btn);
    yes.addEventListener("click", () => decide("确认赴约"));
    const no = el("button", "btn btn-no btn-wide", d.no_btn);
    no.addEventListener("click", () => decide("需要调整约会安排"));

    const c = card(
      el("div", "info-icon", "💌"),
      el("h2", "page-title", d.title),
      el("p", "subtitle", d.tip),
      list,
      yes,
      no,
    );
    app.appendChild(c);
  }

  function decide(choice) {
    state.choice = choice;
    state.view = "ending";
    render();
  }

  /* ============================================================
     结尾页 + Web3Forms 回传
     ============================================================ */
  function renderEnding() {
    const d = CONFIG.ending;
    const ok = state.choice === "确认赴约";
    const title = ok ? d.ok_title : d.adjust_title;
    const content = ok ? d.ok_content : d.adjust_content;
    const icon = ok ? "💖" : "🌷";

    const status = el("p", "send-status", d.status_sending);
    const children = [
      el("div", "info-icon big", icon),
      el("h1", "big-title", title),
    ];
    content.split("\n").forEach((line) => children.push(el("p", "ending-line", line)));
    children.push(status);

    app.appendChild(card(...children));

    submitFeedback(status);
  }

  async function submitFeedback(statusEl) {
    const accessKey = (CONFIG.web3forms.access_key || "").trim();
    const keyReady = accessKey && !/^PLEASE/.test(accessKey) && accessKey.length > 10;

    // 组装邮件正文（同时作为页面快照保留）
    const lines = [];
    CONFIG.pages.forEach((p) => {
      const v = (state.responses[p.title] || "").trim();
      lines.push(p.title + "：" + (v || "（未填写）"));
    });
    const bodyText =
      "【约会邀请反馈】\n\n" +
      "用户最终选择：" + state.choice + "\n" +
      "程序打开时间：" + state.startTime + "\n\n" +
      "—— TA 填写的约会安排 ——\n" +
      lines.join("\n");

    if (!keyReady) {
      // 尚未配置 access key：不真实发送，友好提示
      statusEl.textContent =
        "你的选择已记在心里啦 💕\n（网页尚未配置邮件回传，配置后 TA 就能收到）";
      return;
    }

    const fd = new FormData();
    fd.append("access_key", accessKey);
    fd.append("subject", CONFIG.web3forms.subject || "约会邀请反馈");
    fd.append("botcheck", "");                       // 防垃圾字段，留空即可
    // 字段名必须是 ASCII：Web3Forms 服务端对中文字段名会按 ISO-8859-1
    // 错误编码，导致邮件里字段标签乱码（字段值中文则正常）。
    // 中文标识写进值里，既保留可读性又避免乱码。
    fd.append("reply_email", "回复邮箱：" + (CONFIG.web3forms.reply_to || ""));
    fd.append("content", bodyText);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data && data.success) {
        statusEl.classList.add("ok");
        statusEl.textContent = "✅ 已经把你的选择告诉 TA 啦\nTA 马上就会看到哦 💕";
      } else {
        throw new Error((data && data.message) || "send failed");
      }
    } catch (err) {
      statusEl.textContent =
        "😢 网络有点小状况，暂时没能告诉 TA\n不过你的选择已经记在心里啦";
    }
  }

  /* ---------- 轻提示 toast ---------- */
  function showToast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = el("div", "toast");
      t.id = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  /* ---------- 启动 ---------- */
  render();
})();
