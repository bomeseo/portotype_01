const Onboarding = {
  step: 0,
  after: null,
  start(edit = false) {
    if (edit) delete Store.data.signupDraft;
    this.step = Store.data.signupDraft?.step || 0;
    Nav.go("onboarding");
  },
  initial() {
    const u = Store.data.user;
    return {
      name: u.onboardingComplete ? u.name : "",
      bio: u.bio || "",
      region: u.region || "서울",
      neighborhood: u.neighborhood || "",
      method: u.method,
      interests: u.onboardingComplete ? [...u.interests] : [],
      personalization: u.personalization,
      marketing: u.marketing,
      publicHistory: u.onboardingComplete && u.publicHistory,
      showOnline: u.onboardingComplete && u.showOnline,
      dndEnabled: u.dnd.enabled,
      start: u.dnd.start,
      end: u.dnd.end,
      bids: u.alerts.bids,
      ending: u.alerts.ending,
      chat: u.alerts.chat,
      terms: !!u.consent?.terms,
      privacy: !!u.consent?.privacy,
    };
  },
  toggle(name, label, checked, hint = "") {
    return (
      '<label class="switch-row"><span><strong>' +
      label +
      "</strong><small>" +
      hint +
      '</small></span><input type="checkbox" name="' +
      name +
      '" ' +
      (checked ? "checked" : "") +
      "></label>"
    );
  },
  render() {
    const draft = (Store.data.signupDraft ||= {
      ...this.initial(),
      step: this.step,
    });
    draft.step = this.step;
    Store.save();
    const u = Store.data.user,
      steps = ["내 소개", "관심 카테고리", "거래·인증", "알림·공개 설정"];
    const field = (label, name, val, attrs = "") =>
      '<label class="field">' +
      label +
      '<input name="' +
      name +
      '" value="' +
      esc(val) +
      '" ' +
      attrs +
      "></label>";
    let body = "";
    if (this.step === 0)
      body =
        '<h2>어떤 이름으로 만날까요?</h2><p class="muted">ChatGPT 접속과 별개로, 라이브 경매에서 사용할 프로필을 만들어요.</p>' +
        field(
          "닉네임",
          "name",
          draft.name,
          'minlength="2" maxlength="20" autocomplete="nickname" required placeholder="2~20자, 예: 주말수집가"',
        ) +
        field(
          "한 줄 소개 (선택)",
          "bio",
          draft.bio || "",
          'maxlength="100" placeholder="어떤 물건을 좋아하는지 알려주세요"',
        ) +
        '<div class="notice"><p>프로토타입 가입입니다. 비밀번호나 실제 개인정보 없이 체험할 수 있고, 입력한 내용은 이 브라우저에만 저장됩니다.</p></div>';
    if (this.step === 1)
      body =
        '<h2>어떤 물건에 관심 있으세요?</h2><p class="muted">여러 개를 선택할 수 있어요. 선택하지 않아도 가입할 수 있습니다.</p><div class="interest-options">' +
        CATEGORIES.filter((c) => c.id !== "all")
          .map(
            (c) =>
              '<label><input type="checkbox" name="interests" value="' +
              c.id +
              '" ' +
              (draft.interests.includes(c.id) ? "checked" : "") +
              "><span>" +
              esc(c.name) +
              "</span></label>",
          )
          .join("") +
        "</div>" +
        this.toggle(
          "personalization",
          "선택한 관심사로 추천받기 (선택)",
          draft.personalization,
          "홈의 ‘내 취향’ 추천에 사용해요. 설정에서 언제든 끌 수 있습니다.",
        );
    if (this.step === 2)
      body =
        '<h2>어디서, 어떻게 거래할까요?</h2><div class="form-two"><label class="field">시·도<select name="region">' +
        Membership.regions
          .map(
            (r) =>
              "<option " +
              (r === draft.region ? "selected" : "") +
              ">" +
              r +
              "</option>",
          )
          .join("") +
        "</select></label>" +
        field(
          "시·군·구 / 동네",
          "neighborhood",
          draft.neighborhood,
          'required maxlength="50" placeholder="예: 성동구 성수동"',
        ) +
        '</div><p class="field-hint">정확한 집 주소는 입력하지 마세요. 만날 장소는 거래 채팅에서 따로 정합니다.</p><label class="field">선호 거래 방식<select name="method">' +
        ["둘 다", "직거래", "택배"]
          .map(
            (m) =>
              "<option " +
              (m === draft.method ? "selected" : "") +
              ">" +
              m +
              "</option>",
          )
          .join("") +
        '</select></label><div class="onboarding-verification"><strong>' +
        (u.verified
          ? "데모 휴대전화 인증 완료"
          : "입찰·판매 전에 전화번호 인증이 필요해요") +
        '</strong><p class="muted">인증은 연락 수단 확인 절차입니다. 판매자의 신뢰나 거래 안전을 보장하지 않습니다.</p><button type="button" class="button secondary" id="signup-verify">' +
        (u.verified ? "번호 변경" : "데모 인증하기") +
        "</button><small>테스트 번호 사용 · 실제 문자 발송 없음 · 나중에 인증 가능</small></div>";
    if (this.step === 3)
      body =
        "<h2>알림과 공개 범위를 정해주세요</h2><h3>방해금지 시간 · 한국 시간</h3>" +
        this.toggle(
          "dndEnabled",
          "방해금지 사용",
          draft.dndEnabled,
          "메시지는 저장하고 소리 없이 알림함에 남겨요. 상대에게 방해금지 문구를 보여줍니다.",
        ) +
        '<div class="form-two">' +
        field("시작", "start", draft.start, 'type="time" required') +
        field("종료", "end", draft.end, 'type="time" required') +
        '</div><p class="field-hint">같은 시간으로 설정하면 하루 종일 적용됩니다.</p>' +
        this.toggle("bids", "입찰·낙찰 알림", draft.bids) +
        this.toggle("ending", "찜한 경매 마감 알림", draft.ending) +
        this.toggle("chat", "채팅 알림", draft.chat) +
        this.toggle(
          "publicHistory",
          "완료된 거래 내역 공개",
          draft.publicHistory,
          "전화번호·계좌·채팅 내용은 공개되지 않아요.",
        ) +
        this.toggle(
          "showOnline",
          "접속 상태 공개",
          draft.showOnline,
          "온라인 여부와 최근 접속 시간을 보여줘요.",
        ) +
        '<details class="consent-details"><summary>필수 이용·개인정보 안내 읽기</summary><p>이 서비스는 거래 절차를 시험하는 데모입니다. 경매 마감 때 최고 입찰이 낙찰되며 자동 결제는 없습니다. 입찰 후 상품 조건 변경은 제한됩니다. 취소·문제 거래는 고객센터에 요청할 수 있어요.</p><p>닉네임, 거래 지역·방식, 테스트 전화번호, 관심사, 알림 설정을 이 브라우저에 저장합니다. 목적은 프로필 표시와 거래·추천 체험입니다. 체험 데이터 초기화로 삭제할 수 있습니다. 외부 분석 전송이나 실제 문자·광고 발송은 하지 않습니다.</p></details>' +
        this.toggle("terms", "프로토타입 이용 안내 확인 (필수)", draft.terms) +
        this.toggle(
          "privacy",
          "브라우저 내 정보 저장 안내 확인 (필수)",
          draft.privacy,
        ) +
        this.toggle(
          "marketing",
          "이벤트·혜택 알림 받기 (선택)",
          draft.marketing,
          "동의하지 않아도 이용할 수 있어요. 현재 실제 발송은 없습니다.",
        );
    const root = document.getElementById("view-onboarding");
    root.innerHTML =
      UI.header(
        u.onboardingComplete ? "가입 정보 수정" : "라이브 경매 시작하기",
      ) +
      '<div class="onboarding-layout"><aside><ol class="onboarding-steps">' +
      steps
        .map(
          (s, i) =>
            '<li class="' +
            (i === this.step ? "active" : "") +
            '" ' +
            (i === this.step ? 'aria-current="step"' : "") +
            "><span>" +
            (i + 1) +
            "</span>" +
            s +
            "</li>",
        )
        .join("") +
      '</ol><button class="text-button" id="signup-guest">저장하고 둘러보기</button><p class="field-hint">입력한 단계부터 다시 시작할 수 있어요.</p></aside><form id="signup-form" class="form-card">' +
      body +
      '<p id="signup-error" class="inline-error" role="alert"></p><div class="button-row">' +
      (this.step
        ? '<button type="button" class="button secondary" id="signup-back">이전</button>'
        : "") +
      '<button type="submit" class="button" id="signup-next">' +
      (this.step === 3
        ? u.onboardingComplete
          ? "변경 내용 저장"
          : "가입 완료"
        : "다음") +
      "</button></div></form></div>";
    const form = root.querySelector("#signup-form");
    const capture = () => {
      form.querySelectorAll("[name]").forEach((el) => {
        if (el.name === "interests") return;
        draft[el.name] = el.type === "checkbox" ? el.checked : el.value;
      });
      if (this.step === 1)
        draft.interests = [...form.querySelectorAll('[name="interests"]')]
          .filter((el) => el.checked)
          .map((el) => el.value);
      draft.step = this.step;
      Store.save();
    };
    form.oninput = capture;
    form.onchange = capture;
    root.querySelector("#signup-guest").onclick = () => {
      capture();
      this.after = null;
      Store.data.welcomeSeen = true;
      Store.save();
      Nav.go("home");
    };
    root.querySelector("#signup-back")?.addEventListener("click", () => {
      capture();
      this.step--;
      this.render();
    });
    root.querySelector("#signup-verify")?.addEventListener("click", () => {
      capture();
      Account.verify(() => this.render());
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      capture();
      try {
        if (
          this.step === 0 &&
          (draft.name.trim().length < 2 || draft.name.trim().length > 20)
        )
          throw new Error("닉네임을 2~20자로 입력해 주세요.");
        if (this.step === 2 && !draft.neighborhood.trim())
          throw new Error("거래할 동네를 입력해 주세요.");
        if (this.step < 3) {
          this.step++;
          this.render();
          return;
        }
        Membership.complete(draft);
        const done = this.after;
        this.after = null;
        Nav.go("home");
        toast(
          "가입 정보를 저장했어요. 관심사와 알림은 내 정보에서 바꿀 수 있어요.",
        );
        if (done) Membership.require(done);
        else Tutorial.welcome();
      } catch (err) {
        root.querySelector("#signup-error").textContent = err.message;
      }
    };
  },
};
