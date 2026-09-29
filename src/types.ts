/**
 * @file types.ts
 * @description 바이브 카페 주문 및 메뉴 데이터 타입 정의
 */

// 음료 메뉴 항목 타입
export interface Beverage {
  id: string;
  name: string;
  price: number;
}

// 음료 사이즈 타입
export type BeverageSize = 'S' | 'M' | 'L';

export interface SizeOption {
  id: BeverageSize;
  name: string;
  label: string;
  extraPrice: number;
}

// 추가 옵션 타입
export type ExtraOptionId = 'shot' | 'cream' | 'syrup' | 'decaf';

export interface ExtraOption {
  id: ExtraOptionId;
  name: string;
  price: number;
}

// 주문서 입력 데이터 상태 타입
export interface OrderFormData {
  customerName: string;      // 주문자 이름 (필수)
  phoneNumber: string;       // 전화번호
  beverageId: string;        // 선택한 음료 ID
  size: BeverageSize;        // 음료 사이즈 (기본 M)
  extraOptions: ExtraOptionId[]; // 선택된 추가 옵션 ID 배열
  quantity: number;          // 수량 (1~10)
  requestMemo: string;       // 요청사항 (textarea)
}

// 접수된 주문 내역 타입 (게시판 표시용)
export interface OrderRecord {
  id: string;                // 주문 고유 ID
  orderNumber: number;       // 주문 번호
  customerName: string;      // 주문자 이름
  phoneNumber: string;       // 전화번호
  beverageName: string;      // 음료명
  beveragePrice: number;     // 음료 기본가
  size: BeverageSize;        // 사이즈
  sizePrice: number;         // 사이즈 추가금
  selectedOptionsText: string[]; // 선택된 옵션명 목록
  extraOptionsPrice: number; // 옵션 추가금 합계
  quantity: number;          // 수량
  totalPrice: number;        // 최종 총 금액
  requestMemo: string;       // 요청사항
  createdAt: string;         // 주문 접수 일시
  status: '접수완료' | '제조중' | '픽업대기'; // 게시판 주문 상태
}
