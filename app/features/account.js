const Account = {
  verify(done) {
    let pendingPhone = "",
      expires = 0,
      failures = 0,
      lastSent = 0;
    UI.open(
      "전화번호 인증",
      '<div class="notice">' +
        icon("shield") +
        '<p>프로토타입 인증입니다. 실제 문자는 보내지 않습니다. 테스트 번호를 사용해 주세요.</p></div><form id="verify-form"><label class="field">휴대폰 번호<input id="phone-input" inputmode="tel" maxlength="13" placeholder="01012345678" value="' +
        esc(Store.data.user.phone) +
        '" required></label><button type="button" class="button secondary full" id="send-code">데모 인증번호 받기</button><div id="code-area" hidden><label class="field">인증번호<input id="code-input" inputmode="numeric" maxlength="6" placeholder="6자리 숫자"></label><p class="field-hint">데모 인증번호: <strong>123456</strong> · 3분 동안 유효</p><button class="button full" type="submit">인증 완료</button></div><p class="inline-error" id="verify-error" role="alert"></p><p class="field-hint">제한 번호 체험: 01000000000<br>전화번호는 이 브라우저에만 저장됩니다.</p></form>',
      (d) => {
        const phone = d.querySelector("#phone-input"),
          error = d.querySelector("#verify-error");
        phone.oninput = () => {
          pendingPhone = "";
          d.querySelector("#code-area").hidden = true;
        };
        d.querySelector("#send-code").onclick = () => {
          error.textContent = "";
          const number = phone.value.replace(/\D/g, "");
          if (!/^010\d{8}$/.test(number)) {
            error.textContent = "010으로 시작하는 11자리 번호를 입력해 주세요.";
            return;
          }
          if (Store.data.bannedPhones.includes(number)) {
            error.textContent =
              "가입이 제한된 데모 번호입니다. 고객센터에 확인을 요청해 주세요.";
            return;
          }
          if (Date.now() - lastSent < 10000) {
            error.textContent = "재전송은 10초 후에 가능해요.";
            return;
          }
          pendingPhone = number;
          expires = Date.now() + 180000;
          failures = 0;
          lastSent = Date.now();
          d.querySelector("#code-area").hidden = false;
          d.querySelector("#code-input").focus();
        };
        d.querySelector("#verify-form").onsubmit = (e) => {
          e.preventDefault();
          error.textContent = "";
          if (!pendingPhone || Date.now() > expires) {
            error.textContent = "인증번호가 만료됐어요. 다시 받아주세요.";
            return;
          }
          if (failures >= 5) {
            error.textContent =
              "입력 횟수를 초과했어요. 인증번호를 다시 받아주세요.";
            return;
          }
          if (d.querySelector("#code-input").value !== "123456") {
            failures++;
            error.textContent =
              "인증번호가 일치하지 않아요. (" + failures + "/5)";
            return;
          }
          if (Store.data.bannedPhones.includes(pendingPhone)) {
            error.textContent = "이 번호는 인증할 수 없습니다.";
            return;
          }
          Store.data.user.phone = pendingPhone;
          Store.data.user.verified = true;
          Store.save();
          UI.close();
          done?.();
          if (Nav.current === "profile") ProfileView.render(Nav.params);
        };
      },
    );
  },
  settings() {
    Onboarding.start(true);
  },
  quietHours() {
    const quiet = Store.data.user.dnd;
    UI.open(
      "방해금지 시간",
      '<form id="quiet-form"><div class="notice">' +
        icon("moon") +
        '<p>이 시간에는 메시지가 저장되고 앱 안 알림만 쌓입니다. 상대에게 방해금지 안내가 표시돼요.</p></div><label class="switch-row"><span><strong>방해금지 사용</strong><small>매일 설정한 시간에 적용</small></span><input type="checkbox" name="enabled" ' +
        (quiet.enabled ? "checked" : "") +
        '></label><div class="form-two"><label class="field">시작 시간<input type="time" name="start" value="' +
        quiet.start +
        '" required></label><label class="field">종료 시간<input type="time" name="end" value="' +
        quiet.end +
        '" required></label></div><p class="field-hint">시작과 종료가 같으면 하루 종일 적용됩니다.<br>이 프로토타입은 실제 SMS·푸시 알림을 발송하지 않습니다.</p><button class="button full" type="submit">저장</button></form>',
      (d) => {
        d.querySelector("#quiet-form").onsubmit = (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          Store.data.user.dnd = {
            enabled: f.has("enabled"),
            start: f.get("start"),
            end: f.get("end"),
          };
          Store.save();
          UI.close();
          ProfileView.render(Nav.params);
          toast("방해금지 시간을 저장했어요.");
        };
      },
    );
  },
};
