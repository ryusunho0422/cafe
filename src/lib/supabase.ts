/**
 * @file supabase.ts
 * @description Supabase REST API 클라이언트 (fetch 기반, 외부 패키지 불필요)
 *
 * @supabase/supabase-js 패키지 없이 Supabase REST API를 직접 사용합니다.
 * - GET  : SELECT
 * - POST : INSERT
 * - PATCH: UPDATE
 * - DELETE: DELETE
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
}

/** Supabase REST API 공통 헤더 */
const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation',
};

/** Supabase에서 반환하는 cafe_menu 테이블 Row 타입 */
export interface CafeMenuRow {
  id: number;
  customer_name: string;
  phone_number: string | null;
  beverage_name: string;
  beverage_price: number;
  size: string;
  size_price: number;
  options: string[] | null;
  options_price: number;
  quantity: number;
  total_price: number;
  request_memo: string | null;
  created_at: string;
  /** 주문 상태 (앱 레벨, DB에는 없을 수 있음 → 기본값 '접수완료') */
  status?: '접수완료' | '제조중' | '픽업대기';
}

/** cafe_menu 테이블 전체 조회 (최신순) */
export async function fetchOrders(): Promise<CafeMenuRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cafe_menu?order=created_at.desc`,
    { headers }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] 조회 실패: ${err}`);
  }
  return res.json();
}

/** cafe_menu 테이블에 주문 1건 INSERT */
export async function insertOrder(
  order: Omit<CafeMenuRow, 'id' | 'created_at' | 'status'>
): Promise<CafeMenuRow> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cafe_menu`, {
    method: 'POST',
    headers,
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] 삽입 실패: ${err}`);
  }
  const data: CafeMenuRow[] = await res.json();
  return data[0];
}

/** cafe_menu 테이블에서 주문 1건 DELETE */
export async function deleteOrder(id: number): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cafe_menu?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] 삭제 실패: ${err}`);
  }
}

/**
 * Supabase Realtime 구독 (Postgres Changes)
 * 새 주문이 INSERT될 때 콜백을 호출합니다.
 */
export function subscribeToOrders(
  onInsert: (row: CafeMenuRow) => void
): () => void {
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  const socket = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`);

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let ref = 1;

  const send = (msg: object) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  };

  socket.addEventListener('open', () => {
    // Join channel
    send({
      topic: 'realtime:public:cafe_menu',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'cafe_menu' }],
        },
      },
      ref: String(ref++),
    });

    // Heartbeat 30초마다
    heartbeatInterval = setInterval(() => {
      send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(ref++) });
    }, 30000);
  });

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (
        msg.event === 'postgres_changes' &&
        msg.payload?.data?.type === 'INSERT'
      ) {
        onInsert(msg.payload.data.record as CafeMenuRow);
      }
    } catch {
      // 파싱 오류 무시
    }
  });

  socket.addEventListener('error', (e) => {
    console.warn('[Supabase Realtime] WebSocket 오류:', e);
  });

  // 구독 해제 함수 반환
  return () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}
