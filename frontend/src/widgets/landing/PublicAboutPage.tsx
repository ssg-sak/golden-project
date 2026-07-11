import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

const PublicAboutPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const stagger: Variants = {
    visible: { transition: { staggerChildren: 0.15 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-white px-6 py-24 sm:py-32 lg:px-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border-b border-slate-100">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white opacity-70"></div>
        
        <motion.div 
          className="relative z-10 mx-auto max-w-4xl text-center"
          initial="hidden" animate="visible" variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-8 inline-flex items-center rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            대구광역시 공공의료 시범 서비스
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900 mb-6">
            시민의 골든타임을 지키는<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">
              지능형 응급의료 구조망
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            1분 1초가 급한 응급 상황, 더 이상 병원 문 앞에서 헤매지 마세요.<br className="hidden sm:block"/>
            실시간 빈 병상 안내와 카카오내비 다이렉트 연동으로 시민의 생명을 가장 빠르게 구합니다.
          </motion.p>
          
          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-x-6">
            <button 
              onClick={() => navigate('/')}
              className="rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              응급실 지도 바로가기
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Main Features */}
      <section className="py-24 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-16">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            시민을 위한 실시간 응급 가이드
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            위급 상황 시 당황하지 않고 올바른 행동을 취할 수 있도록 돕습니다.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">카카오내비 즉시 연결</h3>
            <p className="text-slate-600 leading-relaxed flex-1">
              직선거리가 아닌 <strong className="text-slate-900 font-semibold">실제 도착 예상 시간(ETA)</strong>을 기준으로 정렬하며, 원클릭으로 카카오내비 길안내를 시작합니다.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">실시간 빈 병상 필터링</h3>
            <p className="text-slate-600 leading-relaxed flex-1">
              응급실이 꽉 차서 수용 불가능한 병원으로 향하는 '뺑뺑이'를 원천 차단합니다. 남은 병상을 실시간으로 100% 반영합니다.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">노인/소아 맞춤형 필터</h3>
            <p className="text-slate-600 leading-relaxed flex-1">
              심뇌혈관 질환이 잦은 어르신, 고열이 나는 어린이를 위한 맞춤형 응급실을 원클릭으로 신속하게 필터링합니다.
            </p>
          </motion.div>

        </motion.div>
      </section>

      {/* Data Integrity Section */}
      <section className="py-24 px-6 sm:px-8 lg:px-12 bg-white border-t border-slate-100">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-10 sm:p-16 border border-blue-100/50 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900 mb-6">
            가짜 데이터 없는 100% 무결성 시스템
          </h2>
          <p className="text-lg text-blue-800/80 leading-relaxed max-w-2xl mx-auto">
            대구 골든타임 프로젝트는 시민의 생명과 직결된 공공 서비스입니다.<br/>
            화면을 꾸미기 위해 <strong className="font-bold text-blue-900">임의로 만들어낸 가짜 데이터(Mock)는 단 1%도 사용하지 않습니다.</strong><br/>
            오직 보건복지부의 검증된 실시간 데이터로만 무중단 운영됩니다.
          </p>
        </motion.div>
      </section>

      <footer className="py-12 text-center text-slate-500 text-sm border-t border-slate-200 bg-slate-50">
        <p>대구 골든타임 — 공공의료 거버넌스 플랫폼 · 2026</p>
      </footer>
    </div>
  );
};

export default PublicAboutPage;
