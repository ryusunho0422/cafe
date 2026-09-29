/**
 * @file OrderHistoryBoard.tsx
 * @description 카페 주문 게시판 컴포넌트
 * - 접수된 주문 목록을 카페 대기 보드 형식으로 표시
 * - 주문별 상태 변경 (접수완료 -> 제조중 -> 픽업대기)
 * - 개별 주문 Supabase SQL 복사 기능
 */

import React, { useState } from 'react';
import { OrderRecord } from '../types';
import { generateOrderInsertSql } from '../data/supabaseSql';

interface OrderHistoryBoardProps {
  orders: OrderRecord[];
  isLoading?: boolean;
  onUpdateStatus: (orderId: string, newStatus: OrderRecord['status']) => void;
  onDeleteOrder: (orderId: string) => void;
  onOpenSqlModal: () => void;
}

export const OrderHistoryBoard: React.FC<OrderHistoryBoardProps> = ({
  orders,
  isLoading = false,
  onUpdateStatus,
  onDeleteOrder,
  onOpenSqlModal,
}) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // 특정 주문의 Supabase INSERT SQL 복사
  const handleCopyOrderSql = (order: OrderRecord) => {
    const sql = generateOrderInsertSql({
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      beverageName: order.beverageName,
      beveragePrice: order.beveragePrice,
      size: order.size,
      sizePrice: order.sizePrice,
      selectedOptionsText: order.selectedOptionsText,
      extraOptionsPrice: order.extraOptionsPrice,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      requestMemo: order.requestMemo,
    });

    navigator.clipboard.writeText(sql);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div className="w-full bg-[#fffdfa] rounded-2xl shadow-sm border border-[#e8dfd5] p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f0e8de]">
        <div>
          <h3 className="text-base font-bold text-[#4a2e1b] flex items-center gap-2">
            <span>📋</span> 주문 접수 게시판
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#faf6f0] text-[#6b4226] border border-[#e8dfd5] font-semibold">
              총 {orders.length}건
            </span>
          </h3>
          <p className="text-xs text-[#8c6d53] mt-0.5">실시간으로 접수된 바이브 카페 주문 현황입니다.</p>
        </div>

        <button
          type="button"
          onClick={onOpenSqlModal}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#6b4226] text-[#6b4226] hover:bg-[#faf6f0] transition-colors font-medium flex items-center gap-1"
        >
          <span>💾</span> Supabase SQL
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-[#8c6d53]">
          <span className="text-4xl block mb-2">☕</span>
          <p className="text-sm font-medium">아직 접수된 주문이 없습니다.</p>
          <p className="text-xs mt-1 text-[#a89582]">위 주문서에서 첫 번째 음료를 주문해 보세요!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const statusColors: Record<OrderRecord['status'], string> = {
              접수완료: 'bg-amber-50 text-amber-800 border-amber-200',
              제조중: 'bg-blue-50 text-blue-800 border-blue-200',
              픽업대기: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            };

            return (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-[#e8dfd5] bg-[#faf6f0]/40 hover:bg-[#faf6f0] transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#6b4226] text-white">
                      #{order.orderNumber}
                    </span>
                    <span className="font-bold text-[#3e2723] text-sm">
                      {order.customerName} 고객님
                    </span>
                    {order.phoneNumber && (
                      <span className="text-xs text-[#8c6d53]">({order.phoneNumber})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* 상태 변경 셀렉트 */}
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderRecord['status'])}
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                        statusColors[order.status]
                      }`}
                    >
                      <option value="접수완료">접수완료</option>
                      <option value="제조중">제조중 ☕</option>
                      <option value="픽업대기">픽업대기 ✨</option>
                    </select>
                  </div>
                </div>

                {/* 주문 품목 상세 */}
                <div className="text-xs text-[#5a4231] space-y-1 mb-3">
                  <div className="flex items-center justify-between font-medium">
                    <span>
                      {order.beverageName} ({order.size}사이즈) × {order.quantity}잔
                    </span>
                    <span className="font-bold text-[#6b4226] text-sm">
                      {order.totalPrice.toLocaleString()}원
                    </span>
                  </div>

                  {order.selectedOptionsText.length > 0 && (
                    <div className="text-[#8c6d53]">
                      선택 옵션: {order.selectedOptionsText.join(', ')}
                    </div>
                  )}

                  {order.requestMemo && (
                    <div className="text-[#8c6d53] italic bg-white/70 p-2 rounded border border-[#e8dfd5] mt-1.5">
                      💬 &ldquo;{order.requestMemo}&rdquo;
                    </div>
                  )}
                </div>

                {/* 카드 푸터: 주문 시각 및 액션 버튼들 */}
                <div className="flex items-center justify-between text-[11px] text-[#a89582] pt-2 border-t border-[#f0e8de]">
                  <span>접수: {order.createdAt}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyOrderSql(order)}
                      className="px-2 py-1 rounded border border-[#d9cebf] bg-white text-[#6b4226] hover:bg-[#ede5da] transition-all"
                    >
                      {copiedOrderId === order.id ? '✓ SQL 복사됨' : 'SQL 복사'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      className="text-rose-500 hover:text-rose-700 transition-colors"
                      title="주문 삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
