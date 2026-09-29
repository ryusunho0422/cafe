/**
 * @file OrderForm.tsx
 * @description 바이브 카페 음료 주문서 폼 컴포넌트
 * - 모든 input에 label 태그 연결 (id, htmlFor 매핑)
 * - 실시간 예상 금액 계산 (음료 + 사이즈 + 추가옵션 * 수량)
 * - 천 단위 콤마 표시 (toLocaleString)
 * - 유효성 검사 및 주문 확인 메시지 출력
 * - 주문 다시 작성 (초기화) 기능
 */

import React, { useState, useId } from 'react';
import { BEVERAGE_MENU, SIZE_OPTIONS, EXTRA_OPTIONS, DEFAULT_FORM_STATE } from '../data/menu';
import { OrderFormData, OrderRecord, BeverageSize, ExtraOptionId } from '../types';
import { insertOrder } from '../lib/supabase';

interface OrderFormProps {
  // 주문 성공 시 주문 내역 게시판에 추가하는 콜백 함수
  onOrderSuccess: (newOrder: OrderRecord) => void;
  // Supabase SQL 보기 모달 열기 콜백
  onOpenSqlModal: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ onOrderSuccess, onOpenSqlModal }) => {
  // 주문서 입력 양식 상태 관리
  const [formData, setFormData] = useState<OrderFormData>(DEFAULT_FORM_STATE);

  // 주문 완료 후 표시될 확인 메시지 상태
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // 유효성 검증 실패 시 표시될 알림 메시지 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Supabase 주문 저장 중 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 접근성을 위한 고유 ID 생성 (모든 input과 label 연결용)
  const nameInputId = useId();
  const phoneInputId = useId();
  const beverageSelectId = useId();
  const quantityInputId = useId();
  const requestMemoId = useId();

  // 1. 현재 선택된 음료 정보 찾기
  const selectedBeverage = BEVERAGE_MENU.find((item) => item.id === formData.beverageId);

  // 2. 현재 선택된 사이즈 정보 찾기
  const selectedSize = SIZE_OPTIONS.find((item) => item.id === formData.size) || SIZE_OPTIONS[1];

  // 3. 현재 선택된 추가 옵션 총액 계산
  const extraOptionsPrice = formData.extraOptions.reduce((sum, optionId) => {
    const option = EXTRA_OPTIONS.find((opt) => opt.id === optionId);
    return sum + (option ? option.price : 0);
  }, 0);

  // 4. 음료 1잔당 기본 단가 (음료 기본 가격 + 사이즈 추가금 + 옵션 추가금)
  const baseUnitPrice = (selectedBeverage ? selectedBeverage.price : 0) + selectedSize.extraPrice + extraOptionsPrice;

  // 5. 실시간 예상 금액 계산: 음료가 선택되었을 경우 단가 * 수량, 미선택 시 0원
  const estimatedTotalPrice = selectedBeverage ? baseUnitPrice * formData.quantity : 0;

  // 이름 입력 핸들러
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, customerName: e.target.value }));
    if (alertMessage) setAlertMessage(null);
  };

  // 전화번호 입력 핸들러
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }));
  };

  // 음료 선택 핸들러
  const handleBeverageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, beverageId: e.target.value }));
    if (alertMessage) setAlertMessage(null);
  };

  // 사이즈 라디오 변경 핸들러
  const handleSizeChange = (size: BeverageSize) => {
    setFormData((prev) => ({ ...prev, size }));
  };

  // 추가 옵션 체크박스 토글 핸들러
  const handleOptionToggle = (optionId: ExtraOptionId) => {
    setFormData((prev) => {
      const exists = prev.extraOptions.includes(optionId);
      const updatedOptions = exists
        ? prev.extraOptions.filter((id) => id !== optionId)
        : [...prev.extraOptions, optionId];
      return { ...prev, extraOptions: updatedOptions };
    });
  };

  // 수량 변경 핸들러 (최소 1, 최대 10)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setFormData((prev) => ({ ...prev, quantity: 1 }));
    } else {
      // 1 ~ 10 범위 제한
      const clampedVal = Math.min(10, Math.max(1, val));
      setFormData((prev) => ({ ...prev, quantity: clampedVal }));
    }
  };

  // 요청사항 입력 핸들러
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, requestMemo: e.target.value }));
  };

  // 다시 작성 버튼 클릭 핸들러 (모든 입력과 금액 초기화)
  const handleReset = () => {
    setFormData(DEFAULT_FORM_STATE);
    setConfirmationMessage(null);
    setAlertMessage(null);
  };

  // 주문하기 버튼 클릭 핸들러
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사 1: 이름이 비어있으면 "이름을 입력해주세요" 알림
    if (!formData.customerName.trim()) {
      setAlertMessage('이름을 입력해주세요');
      setConfirmationMessage(null);
      const nameInput = document.getElementById(nameInputId);
      if (nameInput) nameInput.focus();
      return;
    }

    // 유효성 검사 2: 음료를 선택하지 않았으면 "음료를 선택해주세요" 알림
    if (!formData.beverageId) {
      setAlertMessage('음료를 선택해주세요');
      setConfirmationMessage(null);
      const beverageSelect = document.getElementById(beverageSelectId);
      if (beverageSelect) beverageSelect.focus();
      return;
    }

    // 정상 처리: 선택된 옵션 명칭 배열 생성
    const selectedOptionsNames = formData.extraOptions
      .map((optId) => EXTRA_OPTIONS.find((item) => item.id === optId)?.name)
      .filter(Boolean) as string[];

    // 옵션 텍스트 형식: 옵션이 있으면 " (샷 추가)", 여러 개면 " (샷 추가, 크림 추가)"
    const optionsTextFormatted = selectedOptionsNames.length > 0
      ? ` (${selectedOptionsNames.join(', ')})`
      : '';

    setAlertMessage(null);
    setIsSubmitting(true);

    try {
      // Supabase에 주문 저장
      const savedRow = await insertOrder({
        customer_name: formData.customerName.trim(),
        phone_number: formData.phoneNumber.trim() || null,
        beverage_name: selectedBeverage?.name || '',
        beverage_price: selectedBeverage?.price || 0,
        size: formData.size,
        size_price: selectedSize.extraPrice,
        options: selectedOptionsNames.length > 0 ? selectedOptionsNames : null,
        options_price: extraOptionsPrice,
        quantity: formData.quantity,
        total_price: estimatedTotalPrice,
        request_memo: formData.requestMemo.trim() || null,
      });

      // 주문 확인 메시지 생성
      const formattedMessage = `${formData.customerName.trim()}님, ${selectedBeverage?.name} ${formData.size}사이즈${optionsTextFormatted} ${formData.quantity}잔, 총 ${estimatedTotalPrice.toLocaleString()}원 주문이 접수되었습니다!`;
      setConfirmationMessage(formattedMessage);

      // 주문 내역 게시판에 기록 전달
      const newRecord: OrderRecord = {
        id: String(savedRow.id),
        orderNumber: savedRow.id,
        customerName: savedRow.customer_name,
        phoneNumber: savedRow.phone_number ?? '',
        beverageName: savedRow.beverage_name,
        beveragePrice: savedRow.beverage_price,
        size: savedRow.size as OrderRecord['size'],
        sizePrice: savedRow.size_price,
        selectedOptionsText: savedRow.options ?? [],
        extraOptionsPrice: savedRow.options_price,
        quantity: savedRow.quantity,
        totalPrice: savedRow.total_price,
        requestMemo: savedRow.request_memo ?? '',
        createdAt: new Date(savedRow.created_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: '접수완료',
      };

      onOrderSuccess(newRecord);
    } catch (err) {
      console.error('[주문 저장 실패]', err);
      setAlertMessage('주문 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#fffdfa] rounded-2xl shadow-sm border border-[#e8dfd5] p-6 sm:p-7">
      {/* 유효성 검사 경고 알림 (이름 미입력 / 음료 미선택 시) */}
      {alertMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-lg bg-[#fde8e8] border border-[#f8b4b4] text-[#9b1c1c] text-sm font-medium flex items-center justify-between animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{alertMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            className="text-xs text-[#9b1c1c] hover:underline ml-2"
          >
            닫기
          </button>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="flex flex-col gap-5">
        {/* 1. 이름 (필수, text) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameInputId} className="text-sm font-semibold text-[#4a2e1b] flex items-center gap-1">
            이름 <span className="text-rose-600 font-bold" aria-hidden="true">*</span>
            <span className="text-xs font-normal text-[#8c6d53]">(필수)</span>
          </label>
          <input
            id={nameInputId}
            type="text"
            placeholder="주문자 성함을 입력해주세요"
            value={formData.customerName}
            onChange={handleNameChange}
            className="w-full p-[10px] rounded-[8px] border border-[#d9cebf] bg-[#faf6f0]/50 text-[#3e2723] text-sm focus:outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#6b4226]/20 transition-all placeholder:text-[#a89582]"
          />
        </div>

        {/* 2. 전화번호 (tel) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={phoneInputId} className="text-sm font-semibold text-[#4a2e1b]">
            전화번호
          </label>
          <input
            id={phoneInputId}
            type="tel"
            placeholder="010-0000-0000"
            value={formData.phoneNumber}
            onChange={handlePhoneChange}
            className="w-full p-[10px] rounded-[8px] border border-[#d9cebf] bg-[#faf6f0]/50 text-[#3e2723] text-sm focus:outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#6b4226]/20 transition-all placeholder:text-[#a89582]"
          />
        </div>

        {/* 3. 음료 선택 (드롭다운) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={beverageSelectId} className="text-sm font-semibold text-[#4a2e1b] flex items-center gap-1">
            음료 선택 <span className="text-rose-600 font-bold" aria-hidden="true">*</span>
            <span className="text-xs font-normal text-[#8c6d53]">(필수)</span>
          </label>
          <select
            id={beverageSelectId}
            value={formData.beverageId}
            onChange={handleBeverageChange}
            className="w-full p-[10px] rounded-[8px] border border-[#d9cebf] bg-[#faf6f0]/50 text-[#3e2723] text-sm focus:outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#6b4226]/20 transition-all cursor-pointer"
          >
            <option value="">음료를 선택해주세요</option>
            {BEVERAGE_MENU.map((beverage) => (
              <option key={beverage.id} value={beverage.id}>
                {beverage.name} {beverage.price.toLocaleString()}원
              </option>
            ))}
          </select>
        </div>

        {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[#4a2e1b]">사이즈 선택</span>
          <div className="flex flex-wrap gap-4 items-center">
            {SIZE_OPTIONS.map((sizeOption) => {
              const radioId = `size-${sizeOption.id}`;
              const isChecked = formData.size === sizeOption.id;
              return (
                <div key={sizeOption.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    id={radioId}
                    type="radio"
                    name="beverageSize"
                    value={sizeOption.id}
                    checked={isChecked}
                    onChange={() => handleSizeChange(sizeOption.id)}
                    className="w-4 h-4 accent-[#6b4226] cursor-pointer"
                  />
                  <label
                    htmlFor={radioId}
                    className={`text-sm cursor-pointer select-none transition-colors ${
                      isChecked ? 'font-bold text-[#6b4226]' : 'text-[#5a4231]'
                    }`}
                  >
                    {sizeOption.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[#4a2e1b]">추가 옵션</span>
          <div className="flex flex-wrap gap-4 items-center">
            {EXTRA_OPTIONS.map((option) => {
              const checkboxId = `option-${option.id}`;
              const isChecked = formData.extraOptions.includes(option.id);
              const priceDisplay = option.price > 0 ? `+${option.price.toLocaleString()}원` : '+0원';
              return (
                <div key={option.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleOptionToggle(option.id)}
                    className="w-4 h-4 rounded accent-[#6b4226] cursor-pointer"
                  />
                  <label
                    htmlFor={checkboxId}
                    className={`text-sm cursor-pointer select-none transition-colors ${
                      isChecked ? 'font-bold text-[#6b4226]' : 'text-[#5a4231]'
                    }`}
                  >
                    {option.name} {priceDisplay}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={quantityInputId} className="text-sm font-semibold text-[#4a2e1b]">
            수량 (최소 1개 ~ 최대 10개)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={quantityInputId}
              type="number"
              min={1}
              max={10}
              value={formData.quantity}
              onChange={handleQuantityChange}
              className="w-full p-[10px] rounded-[8px] border border-[#d9cebf] bg-[#faf6f0]/50 text-[#3e2723] text-sm focus:outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#6b4226]/20 transition-all font-medium"
            />
            {/* 빠르고 직관적인 증감 편의 버튼 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="수량 감소"
                onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                className="w-9 h-[42px] flex items-center justify-center rounded-[8px] border border-[#d9cebf] bg-[#faf6f0] text-[#6b4226] hover:bg-[#ede5da] active:scale-95 transition-all font-bold text-lg"
              >
                -
              </button>
              <button
                type="button"
                aria-label="수량 증가"
                onClick={() => setFormData((prev) => ({ ...prev, quantity: Math.min(10, prev.quantity + 1) }))}
                className="w-9 h-[42px] flex items-center justify-center rounded-[8px] border border-[#d9cebf] bg-[#faf6f0] text-[#6b4226] hover:bg-[#ede5da] active:scale-95 transition-all font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 7. 요청사항 (textarea) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={requestMemoId} className="text-sm font-semibold text-[#4a2e1b]">
            요청사항
          </label>
          <textarea
            id={requestMemoId}
            rows={3}
            placeholder="요청사항이 있으시면 적어주세요 (예: 덜 달게 해주세요, 얼음 적게 등)"
            value={formData.requestMemo}
            onChange={handleMemoChange}
            className="w-full p-[10px] rounded-[8px] border border-[#d9cebf] bg-[#faf6f0]/50 text-[#3e2723] text-sm focus:outline-none focus:border-[#6b4226] focus:ring-2 focus:ring-[#6b4226]/20 transition-all placeholder:text-[#a89582] resize-none"
          />
        </div>

        {/* 실시간 예상 금액 표시 영역 (주문하기 버튼 바로 위에 큰 글씨로 표시) */}
        <div className="pt-2 pb-1 border-t border-[#f0e8de] text-center">
          <div className="text-[24px] text-[#6b4226] font-bold tracking-tight">
            예상 금액: {estimatedTotalPrice.toLocaleString()}원
          </div>
          {selectedBeverage && (
            <div className="text-xs text-[#8c6d53] mt-0.5">
              단가 ({baseUnitPrice.toLocaleString()}원) × {formData.quantity}잔
            </div>
          )}
        </div>

        {/* 버튼 영역 (8. 주문하기 버튼 & 9. 다시 작성 버튼) */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-[8px] bg-[#6b4226] text-white text-base font-semibold shadow-sm hover:bg-[#7e5233] active:scale-[0.99] transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '주문 저장 중...' : '주문하기'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-5 rounded-[8px] border border-[#d9cebf] bg-[#faf6f0] text-[#6b4226] text-sm font-medium hover:bg-[#ede5da] active:scale-[0.99] transition-all cursor-pointer text-center"
          >
            다시 작성
          </button>
        </div>
      </form>

      {/* 주문 확인 메시지 영역: 연두색 배경, 초록 글씨, 둥근 모서리 */}
      {confirmationMessage && (
        <div
          role="status"
          className="mt-6 p-4 rounded-[10px] bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] text-center shadow-sm animate-fade-in"
        >
          <div className="font-bold text-base mb-1">🎉 주문 접수 완료</div>
          <p className="text-sm font-medium leading-relaxed">{confirmationMessage}</p>
          <div className="mt-3 pt-3 border-t border-[#c8e6c9]/60 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenSqlModal}
              className="text-xs underline font-semibold text-[#2e7d32] hover:text-[#1b5e20] transition-colors"
            >
              📋 이 주문의 Supabase INSERT SQL 확인하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
