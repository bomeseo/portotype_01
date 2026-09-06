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
    const u = Store.data.user;
    UI.open(
      "프로필과 거래 설정",
      '<form id="settings-form"><label class="field">닉네임<input name="name" maxlength="20" required value="' +
        esc(u.name) +
        '"></label><label class="field">한 줄 소개<input name="bio" maxlength="100" value="' +
        esc(u.bio) +
        '"></label><div class="form-two"><label class="field">선호 거래 지역<input name="location" maxlength="80" required value="' +
        esc(u.location) +
        '"></label><label class="field">선호 거래 방식<select name="method">' +
        ["둘 다", "직거래", "택배"]
          .map(
            (m) =>
              "<option " +
              (u.method === m ? "selected" : "") +
              ">" +
              m +
              "</option>",
          )
          .join("") +
        '</select></label></div><h3 class="form-section-title">나의 관심사</h3><div class="interest-options">' +
        CATEGORIES.filter((c) => c.id !== "all")
          .map(
            (c) =>
              '<label><input type="checkbox" name="interests" value="' +
              c.id +
              '" ' +
              (u.interests.includes(c.id) ? "checked" : "") +
              "><span>" +
              c.name +
              "</span></label>",
          )
          .join("") +
        '</div><label class="switch-row"><span><strong>거래 내역 공개</strong><small>상품과 거래 완료 내역을 공개해요.</small></span><input type="checkbox" name="publicHistory" ' +
        (u.publicHistory ? "checked" : "") +
        '></label><label class="switch-row"><span><strong>접속 상태 공개</strong><small>온라인·최근 접속 상태를 보여줘요.</small></span><input type="checkbox" name="showOnline" ' +
        (u.showOnline ? "checked" : "") +
        '></label><button class="button full" type="submit">변경 내용 저장</button></form>',
      (d) => {
        d.querySelector("#settings-form").onsubmit = (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (
            !String(f.get("name")).trim() ||
            !String(f.get("location")).trim()
          ) {
            toast("닉네임과 거래 지역을 입력해 주세요.");
            return;
          }
          Object.assign(u, {
            name: f.get("name").trim(),
            bio: f.get("bio").trim(),
            location: f.get("location").trim(),
            method: f.get("method"),
            interests: f.getAll("interests"),
            publicHistory: f.has("publicHistory"),
            showOnline: f.has("showOnline"),
          });
          Store.save();
          UI.close();
          ProfileView.render(Nav.params);
          toast("설정을 저장했어요.");
        };
      },
    );
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
