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

  it('공개 PDF가 2026-08-22 생성·검토 정본과 일치한다', () => {
    const report = readFileSync(
      `${projectRoot}frontend/public/${reportRelativePath}`,
    );
    const digest = createHash('sha256').update(report).digest('hex');

    expect(digest).toBe(
      'fc28064e35cb1b29ba7bb2fc12f728df68c337761a29e9aa841fc148105f9ad8',
    );
  });
});
