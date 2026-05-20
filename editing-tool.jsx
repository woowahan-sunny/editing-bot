import { useState, useRef } from "react";

const COLORS = {
  bg: "#0f0f13",
  surface: "#18181f",
  surface2: "#22222c",
  border: "#2e2e3d",
  accent: "#7c6ef7",
  accent2: "#f0a04b",
  accent3: "#4be0c8",
  pink: "#f06292",
  purple: "#c084fc",
  purple2: "#a78bfa",
  text: "#f0f0f5",
  text2: "#9898b0",
  text3: "#5a5a72",
};

const TYPE_OPTIONS = [
  {
    value: "simple",
    label: "🔹 간소화형",
    desc: "인트로 + 타이틀 + 체크포인트 3개",
    badge: { bg: "rgba(75,224,200,0.15)", color: "#4be0c8", border: "rgba(75,224,200,0.3)" },
  },
  {
    value: "basic",
    label: "🔸 기본형",
    desc: "인트로 + 타이틀 + 체크포인트 3개 + 500자 에디팅",
    badge: { bg: "rgba(240,160,75,0.15)", color: "#f0a04b", border: "rgba(240,160,75,0.3)" },
  },
  {
    value: "pointcut",
    label: "🔺 포인트컷형",
    desc: "인트로 + 타이틀 + 체크포인트 3개 + 500자 에디팅 + 포인트컷 에디팅",
    badge: { bg: "rgba(240,98,146,0.15)", color: "#f06292", border: "rgba(240,98,146,0.3)" },
  },
];

function buildPrompt({ productName, sellingPoints, additionalInfo, editType, pc1, pc2, pc3, imageDescription }) {
  const typeLabel = { simple: "간소화형", basic: "기본형", pointcut: "포인트컷형" }[editType];

  let schema = "";
  if (editType === "simple") {
    schema = '{"intro":"감성 카피 1~2줄","productTitle":"상품명(용량/규격 제외)","checkpoints":["21자이하문구1","21자이하문구2","21자이하문구3"]}';
  } else if (editType === "basic") {
    schema = '{"intro":"감성 카피 1~2줄","productTitle":"상품명(용량/규격 제외)","checkpoints":["21자이하문구1","21자이하문구2","21자이하문구3"],"editing":"500자 이내 에디팅"}';
  } else {
    const pcs = [pc1, pc2, pc3].filter(Boolean);
    const pcSchema = pcs.map(p => '{"title":"' + p + '","content":"포인트컷 에디팅"}').join(",");
    schema = '{"intro":"감성 카피 1~2줄","productTitle":"상품명(용량/규격 제외)","checkpoints":["21자이하문구1","21자이하문구2","21자이하문구3"],"editing":"500자 이내 에디팅","pointcuts":[' + pcSchema + ']}';
  }

  const imageSection = imageDescription
    ? "\n\n[이미지 분석 내용]\n" + imageDescription + "\n위 이미지 내용도 에디팅 작성 시 반영해주세요."
    : "";

  const pcGuide = editType === "pointcut"
    ? "\n포인트컷: 각 포인트컷 주제 중심으로 임팩트 있는 2~4문장. 친근한 말투 필수."
    : "";

  return `당신은 커머스 상세페이지 카피라이팅 전문가입니다.
아래 상품 정보로 ${typeLabel} 에디팅을 생성하세요.

상품명: ${productName}
소구포인트: ${sellingPoints}${additionalInfo ? "\n추가정보: " + additionalInfo : ""}${imageSection}

[말투 규칙 - 매우 중요]
- "-합니다", "-입니다", "-습니다" 딱딱한 격식체 절대 금지
- "-해요", "-이에요", "-답니다", "-거든요", "-랍니다" 친근한 말투 사용
- 나쁜 예: "신선한 재료로 만들었습니다." / 좋은 예: "신선한 재료로 만들었어요."

[인트로 작성 가이드]
- 상품의 핵심 매력을 감성적으로 표현한 짧은 카피
- 1줄 또는 최대 2줄 (줄바꿈 시 \n 사용), 15~25자 내외
- 예시(1줄): "미쉐린도 반한 쫄깃함"
- 예시(2줄): "60년 전통이 담긴 달콤한 한 입\n온 가족이 함께하는 시간"

[타이틀 작성 가이드]
- 입력된 상품명 그대로 사용, g/ml/개입/용량/규격 등 숫자+단위 제거
- 예시: "니끼 버터쿠키 선물세트 200g" → "니끼 버터쿠키 선물세트"

[체크포인트 작성 가이드]
- 소구포인트 내용을 그대로 쓰지 말고, 더 읽기 편하고 매력적으로 다듬어서 작성
- 반드시 각 체크포인트는 21자 이내. 초과 절대 금지.
- 명사형 끝맺음 사용
- 인증/공정: "HACCP인증시설에서 제조" (13자)
- 브랜드력: "60년 전통 제과 브랜드" (11자)
- 활용: "요리·베이킹에 다양하게 활용" (14자)
- 용량특징: "남길 걱정 없는 소용량" (11자)
- 장점: "손질 걱정 없는 조각 과일" (12자)
소구포인트에서 가장 임팩트 있는 3가지를 선택해 21자 이하로 다듬기.

[에디팅 작성 가이드]
- 소구포인트, 추가정보${imageDescription ? ", 이미지 분석 내용" : ""} 을 모두 종합해서 작성
- 상세페이지 공통 삽입용, 자연스럽고 설득력 있는 상품 설명
- 500자 이내, 친근한 말투 필수${pcGuide}

반드시 아래 JSON 형식으로만 응답 (다른 텍스트, 마크다운 없이):
${schema}`;
}

// Image analysis prompt
async function analyzeImage(base64, mimeType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType, data: base64 }
          },
          {
            type: "text",
            text: "이 상품 이미지를 보고 커머스 상세페이지 에디팅에 활용할 수 있는 주요 특징을 간결하게 설명해주세요. 색상, 질감, 용량 표시, 패키지 특징, 조리/활용 방법 등 보이는 정보를 중심으로 3~5가지 핵심 포인트만 간단히 작성해주세요. 마크다운 없이 텍스트로만."
          }
        ]
      }]
    })
  });
  const data = await res.json();
  return data.content.map(i => i.text || "").join("");
}

export default function App() {
  const [editType, setEditType] = useState("simple");
  const [productName, setProductName] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [pc1, setPc1] = useState("");
  const [pc2, setPc2] = useState("");
  const [pc3, setPc3] = useState("");
  const [images, setImages] = useState([]); // [{file, preview, description, analyzing}]
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState({});
  const fileInputRef = useRef(null);

  function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        const base64 = dataUrl.split(",")[1];
        const mimeType = file.type;
        const id = Date.now() + Math.random();

        setImages(prev => [...prev, { id, file, preview: dataUrl, description: "", analyzing: true }]);

        try {
          const desc = await analyzeImage(base64, mimeType);
          setImages(prev => prev.map(img => img.id === id ? { ...img, description: desc, analyzing: false } : img));
        } catch {
          setImages(prev => prev.map(img => img.id === id ? { ...img, description: "", analyzing: false } : img));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(id) {
    setImages(prev => prev.filter(img => img.id !== id));
  }

  async function generate() {
    if (!productName.trim() || !sellingPoints.trim()) {
      setError("상품명과 소구포인트는 필수입니다.");
      return;
    }
    if (editType === "pointcut" && !pc1.trim()) {
      setError("포인트컷형은 포인트컷 1을 입력해주세요.");
      return;
    }
    if (images.some(img => img.analyzing)) {
      setError("이미지 분석이 완료될 때까지 잠시 기다려주세요.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const imageDescription = images.filter(img => img.description).map((img, i) => `이미지${i+1}: ${img.description}`).join("\n");

    try {
      const prompt = buildPrompt({ productName, sellingPoints, additionalInfo, editType, pc1, pc2, pc3, imageDescription });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const raw = data.content.map(i => i.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult({ ...parsed, editType });
    } catch (e) {
      setError("생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function copyText(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 1500);
    });
  }

  function copyAll() {
    if (!result) return;
    let text = "[인트로]\n" + result.intro;
    text += "\n\n[타이틀]\n" + result.productTitle;
    text += "\n\n[체크포인트]\n" + result.checkpoints.map(c => "✓ " + c).join("\n");
    if (result.editing) text += "\n\n[에디팅]\n" + result.editing;
    if (result.pointcuts) result.pointcuts.forEach((pc, i) => {
      text += "\n\n[포인트컷" + (i + 1) + ": " + pc.title + "]\n" + pc.content;
    });
    copyText("all", text);
  }

  const typeInfo = TYPE_OPTIONS.find(t => t.value === (result?.editType || editType));

  const s = {
    wrap: { background: COLORS.bg, minHeight: "100vh", fontFamily: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif", color: COLORS.text },
    header: { background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", borderBottom: "1px solid " + COLORS.border, padding: "18px 28px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 100 },
    badge: { background: "linear-gradient(135deg,#7c6ef7,#9b8ff9)", color: "white", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", padding: "5px 11px", borderRadius: 6 },
    h1: { fontSize: 17, fontWeight: 700, color: COLORS.text },
    sub: { fontSize: 13, color: COLORS.text2, marginLeft: 4 },
    grid: { maxWidth: 1200, margin: "0 auto", padding: "32px 20px", display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "start" },
    panel: { background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, padding: 24 },
    panelTitle: (color) => ({ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.text2, marginBottom: 20, display: "flex", alignItems: "center", gap: 8, borderLeft: "4px solid " + color, paddingLeft: 10 }),
    field: { marginBottom: 18 },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: COLORS.text2, marginBottom: 7 },
    input: { width: "100%", background: COLORS.surface2, border: "1px solid " + COLORS.border, borderRadius: 10, color: COLORS.text, fontSize: 14, padding: "11px 14px", outline: "none", fontFamily: "inherit" },
    textarea: { width: "100%", background: COLORS.surface2, border: "1px solid " + COLORS.border, borderRadius: 10, color: COLORS.text, fontSize: 14, padding: "11px 14px", outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 88, lineHeight: 1.6 },
    typeOpt: (sel) => ({ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", border: "1.5px solid " + (sel ? COLORS.accent : COLORS.border), borderRadius: 10, cursor: "pointer", marginBottom: 8, background: sel ? "rgba(124,110,247,0.1)" : COLORS.surface2 }),
    typeLabel: { fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 2 },
    typeDesc: { fontSize: 12, color: COLORS.text3, lineHeight: 1.4 },
    btn: { width: "100%", padding: "15px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c6ef7,#9b8ff9)", color: "white", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", boxShadow: "0 4px 20px rgba(124,110,247,0.35)", marginTop: 6, fontFamily: "inherit" },
    pcTag: (req) => ({ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0, background: req ? "rgba(124,110,247,0.2)" : "rgba(90,90,114,0.15)", color: req ? COLORS.accent : COLORS.text3, border: "1px solid " + (req ? "rgba(124,110,247,0.4)" : COLORS.border) }),
    outPanel: { background: COLORS.surface, border: "1px solid " + COLORS.border, borderRadius: 14, minHeight: 480, display: "flex", flexDirection: "column" },
    outHeader: { padding: "18px 24px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "space-between" },
    copyAllBtn: { fontSize: 12, fontWeight: 600, color: COLORS.text2, background: COLORS.surface2, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" },
    emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 340, gap: 14, textAlign: "center" },
    resultBlock: { background: COLORS.surface2, border: "1px solid " + COLORS.border, borderRadius: 12, overflow: "hidden", marginBottom: 16 },
    blockHeader: { padding: "11px 18px", borderBottom: "1px solid " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "space-between" },
    blockTitle: (color) => ({ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color }),
    copyBtn: (active) => ({ fontSize: 11, fontWeight: 600, color: active ? COLORS.accent3 : COLORS.text3, background: "transparent", border: "1px solid " + (active ? COLORS.accent3 : COLORS.border), borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }),
    blockBody: { padding: "14px 18px" },
    cpItem: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", fontSize: 14, lineHeight: 1.6, color: COLORS.text, marginBottom: 6 },
    editText: { fontSize: 14, lineHeight: 1.8, color: COLORS.text, whiteSpace: "pre-wrap" },
    charCount: { fontSize: 11, color: COLORS.text3, marginTop: 6, textAlign: "right" },
    typeBadge: (b) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 18, background: b.bg, color: b.color, border: "1px solid " + b.border }),
    errorMsg: { fontSize: 13, color: "#f05b5b", marginTop: 8, padding: "10px 14px", background: "rgba(240,91,91,0.1)", borderRadius: 8, border: "1px solid rgba(240,91,91,0.3)" },
    // Image upload area
    imgUploadArea: { border: "1.5px dashed " + COLORS.border, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", background: COLORS.surface2, transition: "all 0.2s" },
    imgGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 },
    imgThumb: { position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: "1px solid " + COLORS.border },
  };

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div style={s.badge}>CCT</div>
        <h1 style={s.h1}>에디팅 생성기 <span style={s.sub}>커머스콘텐츠기획팀</span></h1>
      </header>

      <div style={s.grid}>
        {/* INPUT */}
        <div style={s.panel}>
          <div style={s.panelTitle(COLORS.accent)}>상품 정보 입력</div>

          {/* TYPE */}
          <div style={s.field}>
            <label style={s.label}>에디팅 유형 <span style={{ color: "#f05b5b" }}>*</span></label>
            {TYPE_OPTIONS.map(opt => (
              <div key={opt.value} style={s.typeOpt(editType === opt.value)} onClick={() => setEditType(opt.value)}>
                <input type="radio" checked={editType === opt.value} onChange={() => setEditType(opt.value)} style={{ accentColor: COLORS.accent, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={s.typeLabel}>{opt.label}</div>
                  <div style={s.typeDesc}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* PRODUCT NAME */}
          <div style={s.field}>
            <label style={s.label}>상품명 <span style={{ color: "#f05b5b" }}>*</span></label>
            <input style={s.input} value={productName} onChange={e => setProductName(e.target.value)} placeholder="예: 니끼 버터 쿠키 선물세트 200g" />
          </div>

          {/* SELLING POINTS */}
          <div style={s.field}>
            <label style={s.label}>소구포인트 <span style={{ color: "#f05b5b" }}>*</span></label>
            <textarea style={s.textarea} value={sellingPoints} onChange={e => setSellingPoints(e.target.value)} placeholder="예: 60년 전통 제과 브랜드, HACCP 인증 시설 제조, 선물용 패키지, 남녀노소 인기&#10;→ 체크포인트로 자동 변환돼요" />
          </div>

          {/* ADDITIONAL INFO */}
          <div style={s.field}>
            <label style={s.label}>추가 정보 <span style={{ fontSize: 11, color: COLORS.text3, fontWeight: 400 }}>선택</span></label>
            <textarea style={{ ...s.textarea, minHeight: 66 }} value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="예: 사용 상황, 레시피, 보관 방법, 타겟 고객, 시즌 등" />
          </div>

          {/* IMAGE UPLOAD */}
          <div style={s.field}>
            <label style={s.label}>
              상품 이미지 <span style={{ fontSize: 11, color: COLORS.text3, fontWeight: 400 }}>선택 · 자동 분석 후 에디팅에 반영</span>
            </label>
            <div
              style={s.imgUploadArea}
              onClick={() => fileInputRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const dt = e.dataTransfer; if (dt.files.length) { const fakeE = { target: { files: dt.files, value: "" }, preventDefault: () => {} }; fakeE.target.value = ""; handleImageUpload({ target: { files: dt.files, value: "" } }); } }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>🖼️</div>
              <div style={{ fontSize: 13, color: COLORS.text3 }}>클릭하거나 이미지를 드래그해서 올려주세요</div>
              <div style={{ fontSize: 11, color: COLORS.text3, marginTop: 4 }}>JPG, PNG, WEBP · 여러 장 가능</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />

            {images.length > 0 && (
              <div style={s.imgGrid}>
                {images.map(img => (
                  <div key={img.id} style={s.imgThumb}>
                    <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {img.analyzing && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>분석 중</span>
                      </div>
                    )}
                    {!img.analyzing && img.description && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", padding: "4px 6px" }}>
                        <span style={{ fontSize: 10, color: COLORS.accent3 }}>✓ 분석완료</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(img.id)}
                      style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "white", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* POINTCUT */}
          {editType === "pointcut" && (
            <div style={{ ...s.field, display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={s.label}>포인트컷 설정</label>
              {[
                { val: pc1, set: setPc1, label: "필수 1", req: true, ph: "강조할 소구포인트 입력" },
                { val: pc2, set: setPc2, label: "선택 2", req: false, ph: "추가 포인트컷 (선택)" },
                { val: pc3, set: setPc3, label: "선택 3", req: false, ph: "추가 포인트컷 (선택)" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={s.pcTag(item.req)}>{item.label}</span>
                  <input style={s.input} value={item.val} onChange={e => item.set(e.target.value)} placeholder={item.ph} />
                </div>
              ))}
            </div>
          )}

          {error && <div style={s.errorMsg}>{error}</div>}

          <button style={{ ...s.btn, opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }} onClick={generate} disabled={loading}>
            {loading ? "⏳ 생성 중..." : "✦ 에디팅 생성하기"}
          </button>
        </div>

        {/* OUTPUT */}
        <div style={s.outPanel}>
          <div style={s.outHeader}>
            <div style={s.panelTitle(COLORS.accent2)}>생성 결과</div>
            {result && (
              <button style={s.copyAllBtn} onClick={copyAll}>
                {copied["all"] ? "✓ 복사됨!" : "전체 복사"}
              </button>
            )}
          </div>
          <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
            {!result && !loading && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 44, opacity: 0.25 }}>✦</div>
                <div style={{ color: COLORS.text3, fontSize: 14, lineHeight: 1.7 }}>상품 정보를 입력하고<br />에디팅 생성 버튼을 눌러주세요</div>
              </div>
            )}
            {loading && (
              <div style={s.emptyState}>
                <div style={{ width: 40, height: 40, border: "3px solid " + COLORS.border, borderTopColor: COLORS.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <div style={{ color: COLORS.text2, fontSize: 14 }}>에디팅 생성 중...</div>
              </div>
            )}
            {result && (
              <div>
                <span style={s.typeBadge(typeInfo.badge)}>{typeInfo.label}</span>

                {/* INTRO */}
                <div style={s.resultBlock}>
                  <div style={s.blockHeader}>
                    <span style={s.blockTitle(COLORS.purple)}>● 인트로</span>
                    <button style={s.copyBtn(copied["intro"])} onClick={() => copyText("intro", result.intro)}>
                      {copied["intro"] ? "✓ 복사됨" : "복사"}
                    </button>
                  </div>
                  <div style={s.blockBody}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line" }}>{result.intro}</div>
                  </div>
                </div>

                {/* PRODUCT TITLE */}
                <div style={s.resultBlock}>
                  <div style={s.blockHeader}>
                    <span style={s.blockTitle(COLORS.purple2)}>● 타이틀</span>
                    <button style={s.copyBtn(copied["ptitle"])} onClick={() => copyText("ptitle", result.productTitle)}>
                      {copied["ptitle"] ? "✓ 복사됨" : "복사"}
                    </button>
                  </div>
                  <div style={s.blockBody}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text2, lineHeight: 1.5 }}>{result.productTitle}</div>
                  </div>
                </div>

                {/* CHECKPOINTS */}
                <div style={s.resultBlock}>
                  <div style={s.blockHeader}>
                    <span style={s.blockTitle(COLORS.accent3)}>● 체크포인트 (필수 3개)</span>
                    <button style={s.copyBtn(copied["cp"])} onClick={() => copyText("cp", result.checkpoints.map(c => "✓ " + c).join("\n"))}>
                      {copied["cp"] ? "✓ 복사됨" : "복사"}
                    </button>
                  </div>
                  <div style={s.blockBody}>
                    {result.checkpoints.map((cp, i) => (
                      <div key={i} style={s.cpItem}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ color: COLORS.accent3, fontWeight: 700, flexShrink: 0 }}>✓</span>
                          {cp}
                        </div>
                        <span style={{ fontSize: 11, color: cp.length > 21 ? "#f05b5b" : COLORS.text3, flexShrink: 0, marginLeft: 8 }}>
                          {cp.length}/21
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EDITING */}
                {result.editing && (
                  <div style={s.resultBlock}>
                    <div style={s.blockHeader}>
                      <span style={s.blockTitle(COLORS.accent2)}>● 공통 에디팅 (500자 이내)</span>
                      <button style={s.copyBtn(copied["ed"])} onClick={() => copyText("ed", result.editing)}>
                        {copied["ed"] ? "✓ 복사됨" : "복사"}
                      </button>
                    </div>
                    <div style={s.blockBody}>
                      <div style={s.editText}>{result.editing}</div>
                      <div style={s.charCount}>{result.editing.length}자</div>
                    </div>
                  </div>
                )}

                {/* POINTCUTS */}
                {result.pointcuts && result.pointcuts.map((pc, i) => (
                  <div key={i} style={s.resultBlock}>
                    <div style={s.blockHeader}>
                      <span style={s.blockTitle(COLORS.pink)}>
                        ● 포인트컷{i + 1}
                        <span style={{ fontWeight: 400, color: COLORS.text3, marginLeft: 6, fontSize: 12 }}>
                          {i === 0 ? "필수" : "선택"} · {pc.title}
                        </span>
                      </span>
                      <button style={s.copyBtn(copied["pc" + i])} onClick={() => copyText("pc" + i, pc.content)}>
                        {copied["pc" + i] ? "✓ 복사됨" : "복사"}
                      </button>
                    </div>
                    <div style={s.blockBody}>
                      <div style={s.editText}>{pc.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
