export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'API 키가 설정되지 않았습니다.' });

  const { pdfBase64, fileName } = req.body || {};
  if (!pdfBase64) return res.status(400).json({ success: false, error: 'PDF 데이터가 없습니다.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: `이 PDF는 대한민국 정부지원사업 공고문입니다.
아래 항목을 정확히 추출해서 순수 JSON으로만 반환하세요. (마크다운, 코드블록 없이)

{
  "announcementTitle": "공고 제목 (전체)",
  "announcementNumber": "공고 번호 (없으면 빈 문자열)",
  "announcingOrg": "공고 기관명",
  "projectName": "지원 사업명",
  "supportField": "지원 분야 (예: 콘텐츠, IT, 제조 등)",
  "supportTarget": "지원 대상 (자격 요건)",
  "supportScale": "지원 규모 (금액, 개수 등)",
  "applicationPeriod": "신청 기간",
  "projectPeriod": "사업 수행 기간",
  "selectionCount": "선정 기업 수 (없으면 빈 문자열)",
  "evaluationCriteria": ["평가 기준 항목1", "평가 기준 항목2", "평가 기준 항목3"],
  "requiredDocuments": ["제출 서류1", "제출 서류2", "제출 서류3"],
  "projectObjective": "사업 목적 및 배경 요약 (3~4문장)",
  "mainSupportContent": ["주요 지원 내용1", "주요 지원 내용2", "주요 지원 내용3"],
  "kpiHints": ["공고에서 언급된 성과 지표1", "성과 지표2"],
  "specialNotes": ["특이사항 또는 우대 조건1", "특이사항2"],
  "contactInfo": "담당 부서 및 연락처 (없으면 빈 문자열)"
}`
            }
          ]
        }]
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
    return res.status(200).json({ success: true, announcement: parsed, fileName });
  } catch (err) {
    console.error('analyze-pdf error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
