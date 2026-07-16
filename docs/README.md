# 📚 문서 모음 — 대구 골든타임

## 최신 개발 안내

- [아키텍처 및 컴포넌트 파일 지도](./architecture/component_file_map_20260714.md)
- [예외 처리 학습서](./guides/exception_handling_study_20260714.md)
- [정책 데이터·모델 용어 학습서](./guides/policy_data_model_terms_study_20260715.md)
- [모바일 브라우저 히스토리·상세 UX 학습서](./guides/mobile_browser_history_ux_study_20260716.md)
- [카카오맵 모바일 임베드 학습서](./guides/kakao_mobile_map_embed_study_20260716.md)
- [예외 처리 개선 보고서](./reports/exception_handling_improvement_report_20260714.md)
- [모바일 병원 상세 UX 개선 보고서](./reports/mobile_hospital_detail_ux_report_20260716.md)
- [모바일 시민용 지도+목록 계획·보고 통합본](./reports/mobile_citizen_map_list_integrated_20260716.md)
- [AI 모델 EDA 계획](./plans/ai_model_eda_plan_20260713.md)

프로젝트(**대구 골든타임 · 응급의료 거버넌스 플랫폼**) 관련 **설명·기획·개발 참고 문서**를 이 폴더에 모아 두었습니다.  
코드와 데이터 폴더와 분리해, 문서만 빠르게 찾을 수 있습니다.

| 문서 | 누가 보나요 | 내용 |
|------|------------|------|
| [기획서.md](./기획서.md) | 시민·기획 | 서비스가 왜 필요한지, 무엇을 보여 주는지 (쉬운 설명) |
| [참고서.md](./참고서.md) | 개발 | 코드·데이터 파이프라인·API·프론트 구조 전체 참고 |
| [hospitals-api-flow.md](./hospitals-api-flow.md) | 개발 | 병원 API → 지도 마커까지 데이터 흐름 |
| [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) | 개발 | 예외·폴백·에러 메시지 **공통 규칙** |
| [AUDIT_STATE_AND_EXCEPTIONS.md](./AUDIT_STATE_AND_EXCEPTIONS.md) | 개발·기획 | **상태 관리·예외 처리 점검 보고서** 및 개선 로드맵 |
| [IMPROVEMENT_REPORT.md](./IMPROVEMENT_REPORT.md) | 개발·유지보수 | 점검 항목별 **적용 완료 개선 보고서** (수정 이력) |
| [MAINTENANCE_AUDIT.md](./MAINTENANCE_AUDIT.md) | 개발·유지보수 | 개선 적용 **후 재감사** — 잔존 이슈·triage·수정 우선순위 |
| [LIVE_OPS_AND_EDGE_CASES.md](./LIVE_OPS_AND_EDGE_CASES.md) | 기획·개발·면접 | **라이브 운영** · 3대장 테스트 · 스트레스 테스트 로드맵 |
| [UX_QA_CHECKLIST.md](./UX_QA_CHECKLIST.md) | 개발·QA | 최근 UX/UI 개선 5개 검증 체크리스트 |
| [../tests/docs/TESTING.md](../tests/docs/TESTING.md) | 개발·QA | **테스트 실행 절차** (Unit · E2E · Edge · Load) |
| [../tests/docs/TEST_RESULTS.md](../tests/docs/TEST_RESULTS.md) | 개발·QA·면접 | **최근 테스트 결과** 보고서 |
| [DEV_SERVERS.md](./DEV_SERVERS.md) | 개발 | **포트·좀비 프로세스** 정리 (8000/5173) |
| [DEV_COMMANDS.md](./DEV_COMMANDS.md) | 개발 | **시작·종료·테스트 명령어** 모음 (복붙용) |
| [PORTFOLIO.md](./PORTFOLIO.md) | 채용·발표 | 포트폴리오·프로젝트 소개용 정리 |

---

## 빠른 길잡이

- **처음 와 봤어요** → [기획서.md](./기획서.md) → 프로젝트 루트 [README.md](../README.md)
- **코드 수정할 거예요** → [참고서.md](./참고서.md)
- **예외·에러 처리 규칙** → [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md)
- **상태·예외 점검 보고서** → [AUDIT_STATE_AND_EXCEPTIONS.md](./AUDIT_STATE_AND_EXCEPTIONS.md)
- **개선 적용 이력 (유지보수)** → [IMPROVEMENT_REPORT.md](./IMPROVEMENT_REPORT.md)
- **개선 후 재감사·잔존 이슈** → [MAINTENANCE_AUDIT.md](./MAINTENANCE_AUDIT.md)
- **라이브·엣지 케이스 테스트** → [LIVE_OPS_AND_EDGE_CASES.md](./LIVE_OPS_AND_EDGE_CASES.md)
- **최근 UX/UI 개선 검증** → [UX_QA_CHECKLIST.md](./UX_QA_CHECKLIST.md)
- **모바일 병원 상세 Back·스크롤·지도 동시** → [히스토리 학습서](./guides/mobile_browser_history_ux_study_20260716.md) · [상세 UX 보고서](./reports/mobile_hospital_detail_ux_report_20260716.md)
- **모바일 지도+목록(카카오맵)** → [임베드 학습서](./guides/kakao_mobile_map_embed_study_20260716.md) · [계획·보고 통합본](./reports/mobile_citizen_map_list_integrated_20260716.md)
- **테스트 실행·결과** → [tests/docs/TESTING.md](../tests/docs/TESTING.md) · [TEST_RESULTS.md](../tests/docs/TEST_RESULTS.md)
- **서버 포트 꼬임 / 좀비 프로세스** → [DEV_SERVERS.md](./DEV_SERVERS.md)
- **시작·종료 명령어 복붙** → [DEV_COMMANDS.md](./DEV_COMMANDS.md)
- **병원 API만 볼 거예요** → [hospitals-api-flow.md](./hospitals-api-flow.md)
- **제출·발표 자료** → [PORTFOLIO.md](./PORTFOLIO.md)

---

*문서 추가 시 이 README 표에 한 줄만 더해 주면 됩니다.*
