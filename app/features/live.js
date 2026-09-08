const Live = {
  loginPage() {
    const root = document.getElementById("view-profile");
    root.innerHTML =
      UI.header("로그인") +
      '<div class="form-layout"><form class="form-card" id="login-form"><label class="field"><span id="identity-label">아이디 또는 이메일</span><input name="identity" autocomplete="username" required maxlength="254"></label><label class="field" id="signup-email" hidden>이메일<input name="email" type="email" maxlength="254" autocomplete="email"></label><label class="field">비밀번호<input name="password" type="password" minlength="10" maxlength="72" autocomplete="current-password" required></label><label class="field" id="signup-name" hidden>닉네임<input name="name" maxlength="20" autocomplete="nickname"></label><p class="field-hint" id="signup-hint" hidden>아이디: 영문으로 시작하는 4~24자 영문·숫자·밑줄. 비밀번호: 10자 이상.</p><p class="inline-error" id="login-error" role="alert"></p><button class="button full" type="submit">로그인</button><button class="text-button full" type="button" id="toggle-signup">처음이신가요? 회원가입</button><button class="button secondary full" type="button" id="phone-login">전화번호로 로그인</button></form></div>';
    let signup = false;
    const form = root.querySelector("#login-form");
    root.querySelector("#toggle-signup").onclick = () => {
      signup = !signup;
      root.querySelector("#signup-name").hidden = !signup;
      root.querySelector("#signup-email").hidden = !signup;
      root.querySelector("#signup-hint").hidden = !signup;
      root.querySelector("#identity-label").textContent = signup
        ? "회원 아이디"
        : "아이디 또는 이메일";
      form.elements.email.required = signup;
      form.elements.name.required = signup;
      form.elements.password.autocomplete = signup
        ? "new-password"
        : "current-password";
      form.querySelector("[type=submit]").textContent = signup
        ? "회원가입"
        : "로그인";
      root.querySelector("#toggle-signup").textContent = signup
        ? "이미 계정이 있어요 · 로그인"
        : "처음이신가요? 회원가입";
    };
    root.querySelector("#phone-login").onclick = () => Account.verify();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      try {
        const values = Object.fromEntries(new FormData(form));
        if (signup) values.username = values.identity;
        await Store.mutate(signup ? "register" : "login", values);
        Nav.go("profile");
        if (Store.data.user.passwordChangeRequired) Account.password();
      } catch (error) {
        root.querySelector("#login-error").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
  },
  async admin() {
    if (Store.data.user.passwordChangeRequired) {
      Account.password();
      return;
    }
    await attempt(async () => {
      const data = await Store.mutate("adminList");
      const row = (title, body, buttons) =>
        '<article class="trade-card"><h3>' +
        esc(title) +
        '</h3><p class="preserve-lines">' +
        esc(body) +
        "</p>" +
        buttons +
        "</article>";
      UI.open(
        "운영 관리",
        "<h3>회원</h3>" +
          data.users
            .map((u) =>
              row(
                u.name,
                (u.username || u.email || "전화번호 가입") +
                  " · " +
                  u.status +
                  " · 평점 " +
                  (u.rating ?? "신규") +
                  " (" +
                  (u.reviewCount || 0) +
                  "개)",
                u.role === "admin"
                  ? "운영자"
                  : '<button class="button secondary" data-user="' +
                      esc(u.id) +
                      '" data-ban="' +
                      (u.status !== "banned") +
                      '">' +
                      (u.status === "banned" ? "이용 제한 해제" : "이용 제한") +
                      "</button>" +
                      (u.verified
                        ? '<button class="button secondary" data-fraud-phone="' +
                          esc(u.id) +
                          '">전화번호 사기 확정</button>'
                        : "") +
                      (data.accounts || [])
                        .filter((a) => a.uid === u.id)
                        .map(
                          (a) =>
                            '<button class="button secondary" data-fraud-account="' +
                            esc(a.key) +
                            '" data-member="' +
                            esc(u.id) +
                            '">' +
                            esc(a.bank + " · " + a.number.slice(-4)) +
                            " 계좌 사기 확정</button>",
                        )
                        .join(""),
              ),
            )
            .join("") +
          "<h3>문의·신고</h3>" +
          ["tickets", "reports"]
            .map((kind) =>
              data[kind]
                .map((t) =>
                  row(
                    t.title || t.reason,
                    (t.body || t.detail) +
                      "\n상태: " +
                      t.status +
                      "\n" +
                      (t.answer || "") +
                      (t.mailStatus ? "\n메일: " + t.mailStatus : ""),
                    '<button class="button secondary" data-ticket="' +
                      esc(t.id) +
                      '" data-kind="' +
                      kind +
                      '">답변·처리</button>',
                  ),
                )
                .join(""),
            )
            .join("") +
          "<h3>상품 관리</h3>" +
          Store.data.auctions
            .filter((a) => a.status !== "hidden" && a.status !== "deleted")
            .map((a) =>
              row(
                a.title,
                a.status,
                '<button class="button secondary" data-hide="' +
                  a.id +
                  '">판매 중지·숨김</button>',
              ),
            )
            .join("") +
          "<h3>최근 처리 기록</h3>" +
          data.audit
            .reverse()
            .map((a) => row(a.action, a.reason + " · " + day(a.at), ""))
            .join(""),
        (d) => {
          const edit = (title, op, values) =>
            UI.open(
              title,
              '<form id="admin-action"><label class="field">사유 또는 답변<textarea name="reason" minlength="3" maxlength="2000" required></textarea></label><p class="inline-error" role="alert"></p><button class="button full">처리 확정</button></form>',
              (dialog) => {
                dialog.querySelector("form").onsubmit = async (e) => {
                  e.preventDefault();
                  try {
                    await Store.mutate(op, {
                      ...values,
                      reason: new FormData(e.target).get("reason"),
                    });
                    await this.admin();
                  } catch (error) {
                    dialog.querySelector("[role=alert]").textContent =
                      error.message;
                  }
                };
              },
            );
          d.querySelectorAll("[data-user]").forEach(
            (b) =>
              (b.onclick = () =>
                edit("회원 이용 제한 변경", "adminUser", {
                  id: b.dataset.user,
                  banned: b.dataset.ban === "true",
                })),
          );
          d.querySelectorAll("[data-fraud-phone]").forEach(
            (b) =>
              (b.onclick = () =>
                edit("사기 증거 확인 후 영구 이용 제한", "adminFraud", {
                  id: b.dataset.fraudPhone,
                  kind: "phone",
                })),
          );
          d.querySelectorAll("[data-fraud-account]").forEach(
            (b) =>
              (b.onclick = () =>
                edit("계좌 사기 증거 확인 후 영구 이용 제한", "adminFraud", {
                  id: b.dataset.member,
                  kind: "account",
                  accountKey: b.dataset.fraudAccount,
                })),
          );
          d.querySelectorAll("[data-ticket]").forEach(
            (b) =>
              (b.onclick = () =>
                edit("문의·신고 답변", "adminTicket", {
                  id: b.dataset.ticket,
                  kind: b.dataset.kind,
                })),
          );
          d.querySelectorAll("[data-hide]").forEach(
            (b) =>
              (b.onclick = () =>
                edit("상품 판매 중지", "adminAuction", { id: b.dataset.hide })),
          );
        },
      );
    });
  },
  start() {
    let failures = 0;
    const tick = async () => {
      if (!document.hidden && !Store.busy) {
        const view = Nav.current,
          params = JSON.stringify(Nav.params);
        const oldMessages = Store.data.chats.reduce(
          (sum, r) => sum + r.messages.length,
          0,
        );
        Store.busy = true;
        let released = false;
        try {
          await Store.refresh();
          failures = 0;
          Store.busy = false;
          released = true;
          const count = Store.data.chats.reduce(
            (sum, r) => sum + r.messages.length,
            0,
          );
          if (count > oldMessages && view !== "chat" && !isDnd(Store.data.user))
            toast("새 메시지가 도착했어요.");
          if (
            view === Nav.current &&
            params === JSON.stringify(Nav.params) &&
            !UI.dialog
          ) {
            if (view === "chat" && !this.composing) {
              const input = document.getElementById("message-input");
              const list = document.getElementById("message-list");
              const scroll = list?.scrollTop || 0,
                follow =
                  !list || list.scrollHeight - scroll - list.clientHeight < 80;
              const draft = input?.value || "",
                focused = document.activeElement === input;
              const start = input?.selectionStart,
                end = input?.selectionEnd;
              ChatView.render(Nav.params);
              if (!follow && document.getElementById("message-list"))
                document.getElementById("message-list").scrollTop = scroll;
              const next = document.getElementById("message-input");
              if (next) {
                next.value = draft;
                if (focused) {
                  next.focus();
                  next.setSelectionRange(start, end);
                }
              }
            } else if (
              [
                "home",
                "likes",
                "detail",
                "profile",
                "seller",
                "support",
              ].includes(view) &&
              !["INPUT", "TEXTAREA", "SELECT"].includes(
                document.activeElement?.tagName,
              )
            )
              Nav.views[view].render(Nav.params);
          }
        } catch (error) {
          if (!failures++)
            toast("연결이 끊겼습니다. 다시 연결을 시도하고 있어요.");
        } finally {
          if (!released) Store.busy = false;
        }
      }
      setTimeout(
        tick,
        failures
          ? Math.min(30000, 3000 * 2 ** failures)
          : Nav.current === "chat"
            ? 3000
            : 15000,
      );
    };
    setTimeout(tick, 3000);
  },
};
Account.verify = function (done) {
  UI.open(
    "전화번호 인증",
    '<form id="phone-form"><label class="field">휴대폰 번호<input name="phone" type="tel" maxlength="13" autocomplete="tel" required></label><button class="button secondary full" type="button" id="request-code">인증번호 받기</button><label class="field">인증번호<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label><p class="field-hint">인증번호는 3분 동안 유효합니다. 재전송은 1분 뒤 가능합니다.</p><p class="inline-error" role="alert"></p><button class="button full" type="submit">인증하고 로그인</button></form>',
    (d) => {
      const form = d.querySelector("form"),
        error = d.querySelector("[role=alert]");
      d.querySelector("#request-code").onclick = async () => {
        try {
          await Store.mutate("requestCode", {
            phone: form.elements.phone.value,
          });
          error.textContent = "인증번호를 발송했습니다.";
        } catch (e) {
          error.textContent = e.message;
        }
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await Store.mutate(
            "verifyCode",
            Object.fromEntries(new FormData(form)),
          );
          UI.close();
          done?.();
          if (Nav.current === "profile") ProfileView.render();
        } catch (e) {
          error.textContent = e.message;
        }
      };
    },
  );
};
