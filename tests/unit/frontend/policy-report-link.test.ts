import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';


const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const reportRelativePath =
  'data/reports/daegu-golden-time-policy-analysis-report.pdf';

describe('공식 정책분석 보고서 링크', () => {
  it('정책 화면이 단일 공개 정본을 가리킨다', () => {
    const source = readFileSync(
      `${projectRoot}frontend/src/widgets/map-dashboard/PolicyDataPipeline.tsx`,
      'utf8',
    );

    expect(source).toContain(reportRelativePath);
    expect(source).not.toContain(
      'data/reports/golden-governance-portfolio.pdf',
    );
  });

  it('공개 PDF가 2026-07-18-r2 논문식 검증본과 일치한다', () => {
    const report = readFileSync(
      `${projectRoot}frontend/public/${reportRelativePath}`,
    );
    const digest = createHash('sha256').update(report).digest('hex');

    expect(digest).toBe(
      'a43ed0bdccf0919416794060f984dd8a28cd25b045a3fe211a4cb4259aab988d',
    );
  });

  it('포트폴리오 생성기가 공개 정책보고서를 덮어쓰지 않는다', () => {
    const source = readFileSync(
      `${projectRoot}scripts/generate_portfolio_pdf.py`,
      'utf8',
    );

    expect(source).toContain('golden-governance-portfolio.pdf');
    expect(source).not.toContain('PUBLIC_REPORT_PATH');
    expect(source).not.toContain('frontend/public/data/reports');
  });
});
