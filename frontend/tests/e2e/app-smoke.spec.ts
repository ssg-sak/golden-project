import { expect, test } from '@playwright/test';

test('시민·정책 탭과 안전 안내가 표시된다', async ({ page }) => {
  await page.goto('/#/');

  await expect(page.getByText('대구 골든타임', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('tab', { name: '응급실 찾기' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '정책·분석 모니터링' })).toBeVisible();
  await expect(page.getByText(/119.*1339/).first()).toBeVisible();
});

test('서비스 소개 화면으로 이동할 수 있다', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('link', { name: '서비스 소개' }).click();

  await expect(page).toHaveURL(/#\/about$/);
  await expect(
    page.getByRole('heading', { name: '시민의 응급의료 탐색과 지역 의료 사각지대 분석을 한곳에' }),
  ).toBeVisible();
});
