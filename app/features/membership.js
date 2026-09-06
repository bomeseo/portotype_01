/* Membership preferences are local demo data, independent of hosting sign-in. */
const Membership = {
  regions: [
    "서울",
    "경기",
    "인천",
    "부산",
    "대구",
    "광주",
    "대전",
    "울산",
    "세종",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
  ],
  normalize() {
    const d = Store.data,
      u = d.user;
    d.version = 4;
    u.onboardingComplete ??= false;
    u.personalization ??= false;
    u.marketing ??= false;
    u.alerts ??= { bids: true, ending: true, chat: true };
    d.recentViews ??= [];
    d.searches ??= [];
    d.tutorial ??= { completed: false };
    d.drafts ??= {};
    d.welcomeSeen ??= false;
    for (const a of d.auctions) {
      a.shippingFee ??= a.method === "직거래" ? 0 : 3500;
      a.flaws ??= "";
      a.components ??= "";
    }
  },
  complete(v) {
    const name = String(v.name || "").trim();
    if (name.length < 2 || name.length > 20)
      throw new Error("닉네임을 2~20자로 입력해 주세요.");
    if (
      !this.regions.includes(v.region) ||
      !String(v.neighborhood || "").trim()
    )
      throw new Error("시·도와 시·군·구 또는 동네를 입력해 주세요.");
    if (!["둘 다", "직거래", "택배"].includes(v.method))
      throw new Error("거래 방식을 선택해 주세요.");
    if (!v.terms || !v.privacy)
      throw new Error("필수 이용 안내와 개인정보 안내를 확인해 주세요.");
    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.start) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.end)
    )
      throw new Error("방해금지 시작·종료 시간을 입력해 주세요.");
    const allowed = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id);
    const u = Store.data.user;
    Object.assign(u, {
      name,
      bio: String(v.bio || "")
        .trim()
        .slice(0, 100),
      location: v.region + " " + String(v.neighborhood).trim(),
      region: v.region,
      neighborhood: String(v.neighborhood).trim(),
      method: v.method,
      interests: [...new Set(v.interests || [])].filter((x) =>
        allowed.includes(x),
      ),
      personalization: !!v.personalization,
      marketing: !!v.marketing,
      publicHistory: !!v.publicHistory,
      showOnline: !!v.showOnline,
      alerts: { bids: !!v.bids, ending: !!v.ending, chat: !!v.chat },
      dnd: { enabled: !!v.dndEnabled, start: v.start, end: v.end },
      consent: {
        terms: true,
        privacy: true,
        version: "prototype-2026-09",
        at: Date.now(),
      },
      onboardingComplete: true,
    });
    Store.data.welcomeSeen = true;
    delete Store.data.signupDraft;
    Store.save();
  },
  require(done) {
    if (!Store.data.user.onboardingComplete) {
      Onboarding.after = done;
      Onboarding.start();
    } else if (!Store.data.user.verified) Account.verify(done);
    else done();
  },
};
