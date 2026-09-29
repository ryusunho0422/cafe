/**
 * @file SupabaseModal.tsx
 * @description Supabase SQL Editor에 복사하여 실행할 수 있는 테이블 생성 및 INSERT 쿼리 뷰어/복사 모달
 */

import React, { useState } from 'react';
import { CREATE_TABLE_SQL, INSERT_DUMMY_DATA_SQL, generateOrderInsertSql } from '../data/supabaseSql';
import { OrderRecord } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestOrder?: OrderRecord | null;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, latestOrder }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'dummy' | 'latest'>('create');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // 클립보드 복사 함수
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // 최근 주문 INSERT SQL 생성
  const latestOrderSql = latestOrder
    ? generateOrderInsertSql({
        customerName: latestOrder.customerName,
        phoneNumber: latestOrder.phoneNumber,
        beverageName: latestOrder.beverageName,
        beveragePrice: latestOrder.beveragePrice,
        size: latestOrder.size,
        sizePrice: latestOrder.sizePrice,
        selectedOptionsText: latestOrder.selectedOptionsText,
        extraOptionsPrice: latestOrder.extraOptionsPrice,
        quantity: latestOrder.quantity,
        totalPrice: latestOrder.totalPrice,
        requestMemo: latestOrder.requestMemo,
      })
    : '-- 최근 접수된 주문이 없습니다. 주문서에서 주문을 작성해 보세요!';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#e8dfd5] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 sm:p-5 bg-[#faf6f0] border-b border-[#e8dfd5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗄️</span>
            <div>
              <h3 className="font-bold text-[#4a2e1b] text-base">Supabase SQL Editor 쿼리문</h3>
              <p className="text-xs text-[#8c6d53]">SQL Editor에 복사하여 바로 실행할 수 있습니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8c6d53] hover:text-[#4a2e1b] hover:bg-[#ede5da] transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-[#e8dfd5] bg-[#fffdfa] px-3 pt-2 gap-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 px-3 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'create'
                ? 'border-[#6b4226] text-[#6b4226] font-bold bg-[#faf6f0]'
                : 'border-transparent text-[#7a6252] hover:text-[#4a2e1b]'
            }`}
          >
            1. cafe_menu 테이블 생성
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dummy')}
            className={`py-2 px-3 rounded-t-lg font-medium transition-colors border-b-2 ${
              activeTab === 'dummy'
                ? 'border-[#6b4226] text-[#6b4226] font-bold bg-[#faf6f0]'
                : 'border-transparent text-[#7a6252] hover:text-[#4a2e1b]'
            }`}
          >
            2. 테스트용 1건 INSERT
          </button>
          {latestOrder && (
            <button
              type="button"
              onClick={() => setActiveTab('latest')}
              className={`py-2 px-3 rounded-t-lg font-medium transition-colors border-b-2 ${
                activeTab === 'latest'
                  ? 'border-[#6b4226] text-[#6b4226] font-bold bg-[#faf6f0]'
                : 'border-transparent text-[#7a6252] hover:text-[#4a2e1b]'
              }`}
            >
              3. 최근 주문 INSERT
            </button>
          )}
        </div>

        {/* 코드 표시 영역 */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-relaxed select-text">
          {activeTab === 'create' && <pre className="whitespace-pre-wrap">{CREATE_TABLE_SQL}</pre>}
          {activeTab === 'dummy' && <pre className="whitespace-pre-wrap">{INSERT_DUMMY_DATA_SQL}</pre>}
          {activeTab === 'latest' && <pre className="whitespace-pre-wrap">{latestOrderSql}</pre>}
        </div>

        {/* 하단 바 및 복사 버튼 */}
        <div className="p-4 bg-[#faf6f0] border-t border-[#e8dfd5] flex items-center justify-between gap-3">
          <span className="text-xs text-[#8c6d53]">
            {activeTab === 'create' && '테이블 생성 후 RLS 보안 정책이 자동 적용됩니다.'}
            {activeTab === 'dummy' && '홍길동님의 주문 1건이 추가됩니다.'}
            {activeTab === 'latest' && '방금 접수한 실제 주문 데이터가 반영된 SQL입니다.'}
          </span>
          <button
            type="button"
            onClick={() => {
              const textToCopy =
                activeTab === 'create'
                  ? CREATE_TABLE_SQL
                  : activeTab === 'dummy'
                  ? INSERT_DUMMY_DATA_SQL
                  : latestOrderSql;
              handleCopy(textToCopy, activeTab);
            }}
            className="px-4 py-2 rounded-lg bg-[#6b4226] text-white text-xs font-semibold hover:bg-[#7e5233] active:scale-95 transition-all shadow-sm shrink-0 flex items-center gap-1.5"
          >
            {copiedKey === activeTab ? '✓ 복사 완료!' : '📋 쿼리문 복사하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
