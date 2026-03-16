export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'API 키가 설정되지 않았습니다.' });

  const { docType, formData, companyProfile, announcement } = req.body || {};
  if (!docType || !formData) return res.status(400).json({ success: false, error: '요청 데이터가 없습니다.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 5000,
        messages: [{ role: 'user', content: buildPrompt(docType, formData, companyProfile, announcement) }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API 오류 (${response.status})`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json({ success: true, content: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function buildPrompt(docType, d, company, ann) {
  const typeNames = { plan: '사업계획서', report: '사업결과보고서', gongmun: '공문', proposal: '사업제안서' };

  const compSec = company ? `
[제안업체 기업 정보 — 문서 전반에 반드시 반영할 것]
기업명: ${company.name || ''}
대표자: ${company.ceo || ''}
사업자번호: ${company.bizNo || ''}
설립연도: ${company.founded || ''}
주소: ${company.address || ''}
주요 사업: ${company.mainBusiness || ''}
기업 소개: ${company.description || ''}
핵심 역량: ${company.capabilities || ''}
주요 수행 실적: ${company.references || ''}
보유 인력 현황: ${company.staff || ''}
연간 매출: ${company.revenue || ''}
인증·수상: ${company.certifications || ''}
` : '';

  const annSec = ann ? `
[정부사업 공고문 — 평가 기준과 요구사항을 문서에 반영할 것]
공고 제목: ${ann.title || ''}
공고 기관: ${ann.org || ''}
지원 분야: ${ann.field || ''}
지원 대상: ${ann.target || ''}
지원 규모/예산: ${ann.scale || ''}
사업 목적: ${ann.objective || ''}
주요 지원 내용: ${ann.content || ''}
평가 기준: ${ann.criteria || ''}
우대 사항: ${ann.preference || ''}
제출 서류: ${ann.documents || ''}
특이사항: ${ann.notes || ''}
※ 이 공고의 평가 기준·요구사항에 최적화된 내용으로 작성하세요.
` : '';

  const base = `
[사업 기본 정보]
사업명: ${d.projectName || ''}
주관기관(발주처): ${d.supervisor || ann?.org || ''}
수행기관(제안업체): ${d.orgName || company?.name || ''}
사업 분야: ${d.field || ann?.field || ''}
사업기간: ${d.startDate || ''} ~ ${d.endDate || ''}
사업예산: ${d.budget || ann?.scale || ''}원
담당부서: ${d.department || '사업추진팀'}
사업 목적: ${d.purpose || ann?.objective || ''}
주요 추진 내용: ${d.mainContent || ''}
KPI: ${d.kpi || ''}
추가 정보: ${d.additionalInfo || '없음'}`;

  const instructions = `당신은 대한민국 정부지원사업 전문 문서 작성가입니다.
아래 모든 정보를 종합하여 ${typeNames[docType] || docType}를 작성하세요.
- 격식체(합니다체) 사용, 실제 제출 수준의 완성도
- 기업의 실제 역량·실적을 구체적으로 반영
- 공고문의 평가 기준에 최적화
- 순수 JSON만 반환 (마크다운 없이)
${compSec}${annSec}${base}`;

  // ── 사업제안서: 이미지 목차 구조 ──────────────────────────
  if (docType === 'proposal') {
    return `${instructions}

아래 목차 구조에 정확히 맞춰 JSON을 작성하세요:
I. 제안 개요 (1.제안 목적 및 범위 / 2.추진방향 및 전략 / 3.제안의 특·장점 / 4.기대효과)
II. 제안업체 일반 (1.일반 현황 / 2.조직 및 인원)
III. 과업수행 부문 (1.과업 중점사항 / 2.과업별 세부추진계획)
IV. 과업관리 부문 (1.수행조직 및 역할 / 2.수행 일정 / 3.보고 및 의사소통 / 4.보안 및 비상대응)
V. 첨부자료

JSON:
{
  "I": {
    "purpose": "제안 목적 2~3문장",
    "scope": ["제안 범위1","제안 범위2","제안 범위3"],
    "direction": ["추진방향1","추진방향2","추진방향3"],
    "strategy": ["추진전략1 (구체적 방법론)","추진전략2","추진전략3"],
    "strengths": ["특장점1 (기업 역량 기반)","특장점2","특장점3","특장점4"],
    "expectedEffects": [{"value":"수치1","label":"기대효과 지표1"},{"value":"수치2","label":"기대효과 지표2"},{"value":"수치3","label":"기대효과 지표3"},{"value":"수치4","label":"기대효과 지표4"}],
    "effectDetails": ["기대효과 상세1","기대효과 상세2","기대효과 상세3"]
  },
  "II": {
    "companyOverview": [["항목명","내용"],["기업명",""],["대표자",""],["설립연도",""],["주소",""],["주요사업",""],["매출액",""],["사업자번호",""]],
    "orgDescription": "조직 구성 및 운영 체계 설명 2~3문장",
    "departments": [{"name":"부서명1","role":"역할 설명","headcount":"인원수"},{"name":"부서명2","role":"역할 설명","headcount":"인원수"},{"name":"부서명3","role":"역할 설명","headcount":"인원수"}],
    "totalStaff": "총 인원",
    "keyPersonnel": [{"name":"성명 또는 직책","role":"담당 역할","career":"주요 경력"}]
  },
  "III": {
    "keyFocusAreas": [{"title":"중점사항1 제목","description":"상세 설명 2문장","approach":"수행 방법론"},{"title":"중점사항2 제목","description":"상세 설명 2문장","approach":"수행 방법론"},{"title":"중점사항3 제목","description":"상세 설명 2문장","approach":"수행 방법론"}],
    "tasks": [{"taskName":"세부과업1 명칭","objectives":["목표1","목표2"],"methods":["방법1","방법2","방법3"],"output":"산출물","period":"수행 기간"},{"taskName":"세부과업2 명칭","objectives":["목표1","목표2"],"methods":["방법1","방법2","방법3"],"output":"산출물","period":"수행 기간"},{"taskName":"세부과업3 명칭","objectives":["목표1","목표2"],"methods":["방법1","방법2"],"output":"산출물","period":"수행 기간"}]
  },
  "IV": {
    "orgChart": [{"role":"PM (프로젝트 매니저)","name":"담당자명/직책","responsibility":"총괄 책임 및 품질 관리"},{"role":"분야 책임자1","name":"담당자명/직책","responsibility":"해당 분야 업무 수행"},{"role":"분야 책임자2","name":"담당자명/직책","responsibility":"해당 분야 업무 수행"},{"role":"지원 인력","name":"담당자명/직책","responsibility":"행정·지원 업무"}],
    "schedule": [{"phase":"1단계","period":"시작월~종료월","tasks":["과업1","과업2"],"milestone":"마일스톤1"},{"phase":"2단계","period":"시작월~종료월","tasks":["과업1","과업2"],"milestone":"마일스톤2"},{"phase":"3단계","period":"시작월~종료월","tasks":["과업1","과업2"],"milestone":"마일스톤3"},{"phase":"완료","period":"종료월","tasks":["최종 납품","결과보고"],"milestone":"사업 완료"}],
    "reporting": ["보고 체계1 (정기 보고 주기 및 방식)","보고 체계2 (긴급 보고 절차)","의사소통 채널 및 도구","회의체 운영 방안"],
    "security": ["보안 정책1 (데이터 보안)","보안 정책2 (접근 권한 관리)","비상 대응 절차1","비상 대응 절차2 (복구 계획)"]
  },
  "V": {
    "attachments": ["붙임 1. 사업자등록증 사본 1부","붙임 2. 법인등기부등본 1부","붙임 3. 재정 상태 확인서 1부","붙임 4. 주요 수행 실적 증빙 자료","붙임 5. 핵심 인력 이력서"]
  }
}`;
  }

  // ── 사업계획서 ──────────────────────────────────────────
  if (docType === 'plan') {
    return `${instructions}

JSON:
{
  "summary": "사업 요약 3~4문장",
  "background": ["배경1","배경2","배경3"],
  "necessity": ["필요성1","필요성2","필요성3","필요성4"],
  "vision": "비전 선언문 1문장",
  "objectives": ["목표1","목표2","목표3","목표4"],
  "kpiPlan": [{"item":"KPI1","target":"목표치","achieved":"-","note":"비고"},{"item":"KPI2","target":"목표치","achieved":"-","note":"비고"},{"item":"KPI3","target":"목표치","achieved":"-","note":"비고"},{"item":"KPI4","target":"목표치","achieved":"-","note":"비고"}],
  "scope": ["범위1","범위2"],
  "mainContents": [{"title":"세부사업1","details":["내용1","내용2","내용3"]},{"title":"세부사업2","details":["내용1","내용2","내용3"]},{"title":"세부사업3","details":["내용1","내용2"]}],
  "organization": ["조직1","조직2"],
  "phases": [{"phase":"1단계","period":"기간1","owner":"담당1","content":"내용1"},{"phase":"2단계","period":"기간2","owner":"담당2","content":"내용2"},{"phase":"3단계","period":"기간3","owner":"담당3","content":"내용3"},{"phase":"완료","period":"종료월","owner":"주관기관","content":"완료"}],
  "partners": ["협력1","협력2"],
  "budgetOverview": ["예산개요1","예산개요2"],
  "budgetItems": [{"item":"인건비","amount":"금액","ratio":"비율%","basis":"산출근거"},{"item":"사업운영비","amount":"금액","ratio":"비율%","basis":"산출근거"},{"item":"외주용역비","amount":"금액","ratio":"비율%","basis":"산출근거"},{"item":"관리비","amount":"금액","ratio":"비율%","basis":"산출근거"}],
  "achievementSummary": [{"value":"수치1","label":"지표1"},{"value":"수치2","label":"지표2"},{"value":"수치3","label":"지표3"},{"value":"수치4","label":"지표4"}],
  "quantResults": ["정량1","정량2","정량3","정량4"],
  "qualResults": ["정성1","정성2","정성3"],
  "utilization": ["활용1","활용2"],
  "risks": ["위험1","위험2","위험3"],
  "riskMitigation": ["대응1","대응2"]
}`;
  }

  // ── 사업결과보고서 ──────────────────────────────────────
  if (docType === 'report') {
    return `${instructions}

JSON:
{
  "summary": "결과 요약 3~4문장",
  "background": ["배경1","배경2"],
  "phases": [{"phase":"1단계","period":"기간1","owner":"담당1","content":"결과1"},{"phase":"2단계","period":"기간2","owner":"담당2","content":"결과2"},{"phase":"3단계","period":"기간3","owner":"담당3","content":"결과3"},{"phase":"완료","period":"종료월","owner":"주관기관","content":"완료"}],
  "method": ["방법1","방법2","방법3"],
  "achievementSummary": [{"value":"달성값1","label":"지표1"},{"value":"달성값2","label":"지표2"},{"value":"달성값3","label":"지표3"},{"value":"달성값4","label":"지표4"}],
  "kpiResults": [{"item":"KPI1","target":"목표","achieved":"달성","note":"비고"},{"item":"KPI2","target":"목표","achieved":"달성","note":"비고"},{"item":"KPI3","target":"목표","achieved":"달성","note":"비고"},{"item":"KPI4","target":"목표","achieved":"미달성","note":"사유"}],
  "quantResults": ["정량1","정량2","정량3","정량4"],
  "qualResults": ["정성1","정성2","정성3"],
  "detailResults": [{"title":"세부사업1 결과","details":["결과1","결과2","결과3"]},{"title":"세부사업2 결과","details":["결과1","결과2"]},{"title":"세부사업3 결과","details":["결과1","결과2"]}],
  "budgetSummary": ["집행요약1","집행요약2"],
  "budgetItems": [{"item":"인건비","amount":"집행금액","ratio":"집행률%","basis":"내역"},{"item":"사업운영비","amount":"집행금액","ratio":"집행률%","basis":"내역"},{"item":"외주용역비","amount":"집행금액","ratio":"집행률%","basis":"내역"},{"item":"관리비","amount":"집행금액","ratio":"집행률%","basis":"내역"}],
  "issues": ["문제1","문제2"],
  "solutions": ["해결1","해결2"],
  "followUpPlan": ["후속1","후속2"],
  "sustainability": ["지속1","지속2","지속3"],
  "conclusion": "종합 의견 3~4문장",
  "futureEffect": ["효과1","효과2","효과3"]
}`;
  }

  // ── 공문 ────────────────────────────────────────────────
  return `${instructions}

JSON:
{
  "docNumber": "문서번호",
  "date": "시행일자",
  "receiver": "수신처",
  "sender": "발신처",
  "title": "공문 제목",
  "greeting": "두문 인사말",
  "mainBody": ["본문1","본문2","본문3"],
  "requestItems": ["요청사항1","요청사항2","요청사항3"],
  "closing": "맺음말",
  "attachments": ["붙임1. 사업계획서 1부","붙임2. 관련 자료 1부"],
  "contactName": "담당자",
  "contactDept": "부서",
  "contactTel": "연락처",
  "contactEmail": "이메일"
}`;
}
