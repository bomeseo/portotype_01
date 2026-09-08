const Account = {
  password() {
    UI.open(
      "비밀번호 변경",
      '<form id="password-form"><p>변경하면 다른 기기의 기존 로그인이 해제됩니다.</p><label class="field">현재 비밀번호<input name="currentPassword" type="password" autocomplete="current-password" required></label><label class="field">새 비밀번호<input name="newPassword" type="password" minlength="10" maxlength="72" autocomplete="new-password" required></label><label class="field">새 비밀번호 확인<input name="confirmPassword" type="password" autocomplete="new-password" required></label><p class="inline-error" role="alert"></p><button class="button full">비밀번호 변경</button></form>',
      (d) => {
        d.querySelector("form").onsubmit = async (e) => {
          e.preventDefault();
          const v = Object.fromEntries(new FormData(e.target));
          const error = d.querySelector("[role=alert]");
          if (v.newPassword !== v.confirmPassword) {
            error.textContent = "새 비밀번호가 일치하지 않습니다.";
            return;
          }
          try {
            await Store.mutate("changePassword", v);
            UI.close();
            toast("비밀번호를 변경했어요.");
          } catch (err) {
            error.textContent = err.message;
          }
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
        d.querySelector("#settings-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (
            !String(f.get("name")).trim() ||
            !String(f.get("location")).trim()
          ) {
            toast("닉네임과 거래 지역을 입력해 주세요.");
            return;
          }
          try {
            await Store.mutate("settings", {
              values: {
                name: f.get("name").trim(),
                bio: f.get("bio").trim(),
                location: f.get("location").trim(),
                method: f.get("method"),
                interests: f.getAll("interests"),
                publicHistory: f.has("publicHistory"),
                showOnline: f.has("showOnline"),
              },
            });
          } catch (error) {
            toast(error.message);
            return;
          }
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
        '" required></label></div><p class="field-hint">시작과 종료가 같으면 하루 종일 적용됩니다.<br>한국 표준시 기준입니다. 휴대전화의 무음 설정은 변경하지 않습니다.</p><button class="button full" type="submit">저장</button></form>',
      (d) => {
        d.querySelector("#quiet-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          try {
            await Store.mutate("settings", {
              values: {
                dnd: {
                  enabled: f.has("enabled"),
                  start: f.get("start"),
                  end: f.get("end"),
                },
              },
            });
          } catch (error) {
            toast(error.message);
            return;
          }
          UI.close();
          ProfileView.render(Nav.params);
          toast("방해금지 시간을 저장했어요.");
        };
      },
    );
  },
};
