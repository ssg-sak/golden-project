import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';


const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const reportRelativePath =
  'data/reports/daegu-golden-time-policy-analysis-report.pdf';

describe('공식 정책분석 보고서 링크', () => {
  it('정책 화면이 자동 생성 포트폴리오 대신 검증본을 가리킨다', () => {
    const source = readFileSync(
      `${projectRoot}frontend/src/widgets/map-dashboard/PolicyDataPipeline.tsx`,
      'utf8',
    );

    expect(source).toContain(reportRelativePath);
    expect(source).not.toContain(
      'data/reports/golden-governance-portfolio.pdf',
    );
  });

  it('공개 PDF가 전달받은 2026-07-18 검증본과 일치한다', () => {
    const report = readFileSync(
      `${projectRoot}frontend/public/${reportRelativePath}`,
    );
    const digest = createHash('sha256').update(report).digest('hex');

    expect(digest).toBe(
      'a43ed0bdccf0919416794060f984dd8a28cd25b045a3fe211a4cb4259aab988d',
    );
  });
});
