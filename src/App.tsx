/**
 * @file App.tsx
 * @description 바이브 카페 주문 및 게시판 메인 애플리케이션
 *
 * [주요 디자인 및 요구사항]
 * - 따뜻한 베이지(#faf6f0) 및 브라운(#6b4226) 컬러 팔레트
 * - 최대 너비 520px 가운데 정렬 (max-w-[520px] mx-auto)
 * - 폰트: '맑은 고딕', sans-serif
 * - 상단: 큰 ☕ 이모지 로고, 카페 이름 '바이브 카페', 부제 '당신의 하루에 바이브를 더하다'
 * - 실시간 금액 계산, 유효성 검사, 주문 확인 메시지, 초기화 기능
 * - Supabase DB 연동: 주문 저장/조회/삭제 + 실시간 구독
 */

import React, { useState, useEffect, useCallback } from 'react';
import { OrderForm } from './components/OrderForm';
import { OrderHistoryBoard } from './components/OrderHistoryBoard';
import { SupabaseModal } from './components/SupabaseModal';
import { OrderRecord } from './types';
import { fetchOrders, deleteOrder, subscribeToOrders, CafeMenuRow } from './lib/supabase';

/** Supabase Row → 앱 OrderRecord 변환 */
function rowToOrderRecord(row: CafeMenuRow): OrderRecord {
  const createdAt = new Date(row.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return {
    id: String(row.id),
    orderNumber: row.id,
    customerName: row.customer_name,
    phoneNumber: row.phone_number ?? '',
    beverageName: row.beverage_name,
    beveragePrice: row.beverage_price,
    size: row.size as OrderRecord['size'],
    sizePrice: row.size_price,
    selectedOptionsText: row.options ?? [],
    extraOptionsPrice: row.options_price,
    quantity: row.quantity,
    totalPrice: row.total_price,
    requestMemo: row.request_memo ?? '',
    createdAt,
    status: row.status ?? '접수완료',
  };
}

export default function App() {
  // 접수된 주문 목록 상태
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // 로딩 / 에러 상태
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 현재 활성화된 화면 모드 ('order' : 주문서 작성, 'board' : 주문 게시판)
  const [activeTab, setActiveTab] = useState<'order' | 'board'>('order');

  // Supabase SQL 모달 표시 여부 상태
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // 최근 접수된 주문 (Supabase INSERT SQL 자동 생성용)
  const [latestOrder, setLatestOrder] = useState<OrderRecord | null>(null);

  // ─── Supabase에서 주문 목록 초기 로드 ───────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const rows = await fetchOrders();
      setOrders(rows.map(rowToOrderRecord));
    } catch (e) {
      console.error(e);
      setLoadError('주문 내역을 불러오지 못했습니다. Supabase 연결을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ─── Supabase Realtime 구독 (다른 기기/탭에서 주문 시 자동 반영) ──────────
  useEffect(() => {
    const unsubscribe = subscribeToOrders((newRow) => {
      const newRecord = rowToOrderRecord(newRow);
      setOrders((prev) => {
        // 이미 있는 주문은 중복 추가하지 않음
        if (prev.some((o) => o.id === newRecord.id)) return prev;
        return [newRecord, ...prev];
      });
    });
    return unsubscribe;
  }, []);

  // ─── 신규 주문 접수 완료 시 호출되는 콜백 ────────────────────────────────
  const handleOrderSuccess = (newOrder: OrderRecord) => {
    setOrders((prev) => {
      // Realtime 구독으로 이미 추가된 경우 중복 방지
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
    setLatestOrder(newOrder);
  };

  // ─── 주문 상태 업데이트 핸들러 (로컬 상태만 변경) ────────────────────────
  const handleUpdateStatus = (orderId: string, newStatus: OrderRecord['status']) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
  };

  // ─── 주문 삭제 핸들러 (Supabase DB에서도 삭제) ───────────────────────────
  const handleDeleteOrder = async (orderId: string) => {
    // UI에서 먼저 제거 (낙관적 업데이트)
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    try {
      await deleteOrder(Number(orderId));
    } catch (e) {
      console.error('[삭제 실패]', e);
      // 실패 시 다시 로드
      loadOrders();
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] text-[#3e2723] flex flex-col items-center justify-start py-8 px-4 font-sans selection:bg-[#6b4226] selection:text-white">
      {/* 
        [전체 디자인 가이드라인 준수]
        최대 너비 520px, 가운데 정렬 (max-w-[520px] w-full mx-auto)
      */}
      <main className="w-full max-w-[520px] flex flex-col items-center">
        
        {/* ===================================================
            [페이지 상단 헤더]
            - 카페 로고: ☕ 이모지 크게
            - 카페 이름: "바이브 카페"
            - 부제: "당신의 하루에 바이브를 더하다"
            =================================================== */}
        <header className="w-full text-center mb-6">
          {/* 큰 ☕ 이모지 로고 */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#f4ebe1] border-2 border-[#e8dfd5] shadow-xs mb-3 transition-transform hover:scale-105 select-none">
            <span className="text-4xl sm:text-5xl" role="img" aria-label="카페 로고">
              ☕
            </span>
          </div>

          {/* 카페 이름 */}
          <h1 className="text-3xl sm:text-[32px] font-bold text-[#4a2e1b] tracking-tight">
            바이브 카페
          </h1>

          {/* 부제 */}
          <p className="text-sm sm:text-base text-[#7a583e] mt-1 font-medium">
            당신의 하루에 바이브를 더하다
          </p>

          {/* Supabase 연결 상태 표시 */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {isLoading ? (
              <span className="text-xs text-[#8c6d53] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Supabase 연결 중...
              </span>
            ) : loadError ? (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                연결 실패
              </span>
            ) : (
              <span className="text-xs text-[#8c6d53] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                Supabase 연결됨
              </span>
            )}
          </div>
        </header>

        {/* 상단 탭 네비게이션 & Supabase 빠른 가이드 버튼 */}
        <div className="w-full flex items-center justify-between mb-4 gap-2">
          {/* 주문서 / 게시판 탭 */}
          <div className="flex bg-[#ede5da] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'order'
                  ? 'bg-white text-[#6b4226] shadow-xs'
                  : 'text-[#7a583e] hover:text-[#4a2e1b]'
              }`}
            >
              📝 음료 주문서
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'board'
                  ? 'bg-white text-[#6b4226] shadow-xs'
                  : 'text-[#7a583e] hover:text-[#4a2e1b]'
              }`}
            >
              <span>📋 주문 게시판</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#6b4226] text-white">
                {orders.length}
              </span>
            </button>
          </div>

          {/* Supabase SQL 스크립트 모달 열기 버튼 */}
          <button
            type="button"
            onClick={() => setIsSqlModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-[#c9baa7] bg-[#fffdfa] hover:bg-[#ede5da] text-[#6b4226] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            title="Supabase SQL Editor 복사용 쿼리문 열기"
          >
            <span>⚡</span>
            <span>Supabase SQL</span>
          </button>
        </div>

        {/* 로드 에러 배너 */}
        {loadError && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>⚠️ {loadError}</span>
            <button
              type="button"
              onClick={loadOrders}
              className="ml-3 underline font-semibold hover:text-red-900"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 화면 본문: 탭에 따라 주문서 폼 또는 게시판 표시 */}
        {activeTab === 'order' ? (
          <OrderForm
            onOrderSuccess={(record) => {
              handleOrderSuccess(record);
            }}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />
        ) : (
          <OrderHistoryBoard
            orders={orders}
            isLoading={isLoading}
            onUpdateStatus={handleUpdateStatus}
            onDeleteOrder={handleDeleteOrder}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />
        )}

        {/* 푸터 */}
        <footer className="w-full text-center mt-8 pt-4 border-t border-[#e8dfd5]/60 text-xs text-[#a89582]">
          <p>© {new Date().getFullYear()} 바이브 카페 (Vibe Cafe). All rights reserved.</p>
        </footer>
      </main>

      {/* Supabase SQL 복사 모달 */}
      <SupabaseModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        latestOrder={latestOrder}
      />
    </div>
  );
}
