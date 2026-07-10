import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PublicAboutPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 스크롤 초기화
    window.scrollTo(0, 0);
  }, []);

  const styles = {
    container: {
      backgroundColor: '#f8f9fa',
      color: '#333',
      fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
      minHeight: '100vh',
    },
    hero: {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      padding: '80px 20px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '800',
      color: '#1a202c',
      marginBottom: '1rem',
      lineHeight: '1.4',
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#4a5568',
      maxWidth: '700px',
      margin: '0 auto 2rem',
      lineHeight: '1.6',
    },
    primaryBtn: {
      backgroundColor: '#1a73e8',
      color: 'white',
      border: 'none',
      padding: '12px 28px',
      fontSize: '1.1rem',
      fontWeight: '600',
      borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(26, 115, 232, 0.2)',
      transition: 'background-color 0.2s',
    },
    section: {
      padding: '80px 20px',
      maxWidth: '1000px',
      margin: '0 auto',
    },
    sectionAlt: {
      backgroundColor: '#ffffff',
      padding: '80px 20px',
    },
    sectionTitle: {
      fontSize: '1.8rem',
      fontWeight: '700',
      color: '#2d3748',
      marginBottom: '10px',
      textAlign: 'center' as const,
    },
    sectionDesc: {
      fontSize: '1rem',
      color: '#718096',
      textAlign: 'center' as const,
      marginBottom: '50px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '30px',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    cardIcon: {
      fontSize: '2rem',
      marginBottom: '15px',
      display: 'block',
    },
    cardTitle: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#2b6cb0',
      marginBottom: '10px',
    },
    cardText: {
      color: '#4a5568',
      lineHeight: '1.6',
      fontSize: '0.95rem',
    },
    dataPolicy: {
      backgroundColor: '#e3f2fd',
      border: '1px solid #90caf9',
      borderRadius: '12px',
      padding: '40px',
      textAlign: 'center' as const,
      maxWidth: '800px',
      margin: '0 auto',
    },
    footer: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      backgroundColor: '#ffffff',
      color: '#a0aec0',
      fontSize: '0.9rem',
      borderTop: '1px solid #e0e0e0',
    }
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={{ display: 'inline-block', backgroundColor: '#ebf8f2', color: '#048a4f', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px' }}>
          대구광역시 공공의료 시범 서비스
        </div>
        <h1 style={styles.title}>
          대구 시민의 골든타임을 지키는<br />
          <span style={{ color: '#e53e3e' }}>지능형 응급의료 구조망</span>
        </h1>
        <p style={styles.subtitle}>
          1분 1초가 급한 응급 상황, 더 이상 병원 문 앞에서 헤매지 마세요.<br />
          실시간 빈 병상 안내와 카카오내비 다이렉트 연동으로 시민의 생명을 가장 빠르게 구합니다.
        </p>
        <button 
          style={styles.primaryBtn}
          onClick={() => navigate('/')}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
        >
          응급실 지도 바로가기
        </button>
      </div>

      {/* Citizen Value Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>시민을 위한 실시간 응급 가이드</h2>
        <p style={styles.sectionDesc}>위급 상황 시 당황하지 않고 올바른 행동을 취할 수 있도록 돕습니다.</p>
        
        <div style={styles.grid}>
          <div style={styles.card}>
            <span style={styles.cardIcon}>🚑</span>
            <h3 style={styles.cardTitle}>카카오내비 즉시 연결</h3>
            <p style={styles.cardText}>
              직선거리가 아닌 <b>현재 교통 상황이 반영된 실제 도착 예상 시간(ETA)</b>을 기준으로 가장 빨리 갈 수 있는 병원을 정렬하여 보여주고, 원클릭으로 카카오내비 안내를 시작합니다.
            </p>
          </div>
          <div style={styles.card}>
            <span style={styles.cardIcon}>🟢</span>
            <h3 style={styles.cardTitle}>실시간 빈 병상 필터링</h3>
            <p style={styles.cardText}>
              응급실이 꽉 차서 수용 불가능한 병원으로 향하는 '헛걸음(응급실 뺑뺑이)'을 원천 차단합니다. 수용 불가능한 병원은 붉게 표시되어 후순위로 밀려납니다.
            </p>
          </div>
          <div style={styles.card}>
            <span style={styles.cardIcon}>👨‍👩‍👧‍👦</span>
            <h3 style={styles.cardTitle}>노인/소아 맞춤형 필터</h3>
            <p style={styles.cardText}>
              심뇌혈관 질환이 잦은 어르신, 고열이 나는 어린이를 위한 권역센터 및 달빛어린이병원을 원클릭으로 필터링하여 맞춤형 정보를 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Governance Value Section */}
      <div style={{...styles.sectionAlt}}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={styles.sectionTitle}>행정을 위한 응급 인프라 관제</h2>
          <p style={styles.sectionDesc}>데이터를 기반으로 지역 응급의료 사각지대를 모니터링합니다.</p>
          
          <div style={styles.grid}>
            <div style={styles.card}>
              <span style={styles.cardIcon}>🗺️</span>
              <h3 style={styles.cardTitle}>사각지대 지수(VDI) 분석</h3>
              <p style={styles.cardText}>
                시청 및 보건소 정책 관리자를 위한 모니터링 화면(탭 B)에서는 인구 대비 응급 인프라가 부족한 동네를 히트맵으로 시각화하여 보여줍니다.
              </p>
            </div>
            <div style={styles.card}>
              <span style={styles.cardIcon}>🏥</span>
              <h3 style={styles.cardTitle}>HIRA 팩트 기반 관제</h3>
              <p style={styles.cardText}>
                건강보험심사평가원의 데이터를 연동하여 각 응급의료기관의 <b>전문의 수, CT/MRI 보유 대수</b>를 실시간으로 교차 검증하고 관제합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Philosophy */}
      <div style={styles.section}>
        <div style={styles.dataPolicy}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0d47a1', marginBottom: '15px' }}>
            가짜 데이터 없는 100% 무결성 시스템
          </h2>
          <p style={{ color: '#1565c0', lineHeight: '1.6', fontSize: '1.05rem', margin: 0 }}>
            대구 골든타임 프로젝트는 시민의 생명과 직결된 공공 서비스입니다.<br />
            UI를 채우기 위해 <b>임의로 만들어낸 가짜 데이터(Mock)는 단 1%도 사용하지 않습니다.</b><br />
            오직 국립중앙의료원과 보건복지부의 검증된 실시간 데이터와, <br />네트워크 장애 시에도 멈추지 않는 오프라인 폴백(Fallback) 방어 로직으로 무중단 운영됩니다.
          </p>
        </div>
      </div>

      <div style={styles.footer}>
        대구 골든타임 — 공공의료 거버넌스 플랫폼 · 2026
      </div>
    </div>
  );
};

export default PublicAboutPage;
