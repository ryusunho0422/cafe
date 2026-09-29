/**
 * @file menu.ts
 * @description 바이브 카페 음료 메뉴 및 주문 옵션 기본 데이터 정의
 */

import { Beverage, SizeOption, ExtraOption } from '../types';

// 음료 메뉴 목록 (드롭다운에 표시될 음료 목록)
export const BEVERAGE_MENU: Beverage[] = [
  { id: 'americano', name: '아메리카노', price: 3500 },
  { id: 'caffe_latte', name: '카페라떼', price: 4000 },
  { id: 'caffe_mocha', name: '카페모카', price: 4500 },
  { id: 'vanilla_latte', name: '바닐라라떼', price: 4500 },
  { id: 'greentea_latte', name: '녹차라떼', price: 4500 },
];

// 음료 사이즈 옵션 목록 (라디오 버튼)
export const SIZE_OPTIONS: SizeOption[] = [
  { id: 'S', name: 'S사이즈', label: 'S (+0원)', extraPrice: 0 },
  { id: 'M', name: 'M사이즈', label: 'M (+500원)', extraPrice: 500 },
  { id: 'L', name: 'L사이즈', label: 'L (+1,000원)', extraPrice: 1000 },
];

// 추가 옵션 목록 (체크박스)
export const EXTRA_OPTIONS: ExtraOption[] = [
  { id: 'shot', name: '샷 추가', price: 500 },
  { id: 'cream', name: '크림 추가', price: 500 },
  { id: 'syrup', name: '시럽 추가', price: 300 },
  { id: 'decaf', name: '디카페인', price: 0 },
];

// 기본 주문서 입력 상태값
export const DEFAULT_FORM_STATE = {
  customerName: '',
  phoneNumber: '',
  beverageId: '',
  size: 'M' as const,
  extraOptions: [],
  quantity: 1,
  requestMemo: '',
};
