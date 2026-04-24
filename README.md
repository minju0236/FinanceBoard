# 📈 주식 모의 투자 & 커뮤니티 웹 서비스 (CRUD)

## 1. 프로젝트 개요

### 배포 화면
<img width="1915" height="1017" alt="스크린샷 2026-04-10 224106" src="https://github.com/user-attachments/assets/c8573a0a-0314-4b09-bc40-ba66ddfe36aa" />

- **수행 주제**: JWT 기반 인증이 포함된 모의 주식 투자 및 게시판 웹 서비스
- **배포 주소**: (Cloudflare 연결 URL 입력)
- **사용 기술**
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js (Express)
- Database: MariaDB
- 인증: JWT (JSON Web Token)
- 인프라: GCP, Cloudflare

---

## 2. 백엔드 구성 및 라우팅

`server.js`를 중심으로 REST API를 구성하였으며, JWT 인증을 기반으로 사용자 데이터를 보호하였다.

### 🔐 인증 관련
- `POST /api/signup` → 회원가입
- `POST /api/login` → 로그인 및 JWT 발급
- `GET /api/user/me` → 로그인 사용자 정보 조회
- `GET /api/user/profit` → 수익률 계산

### 📊 대시보드 (주식 데이터)
- `GET /api/dashboard/summary` → 현재가, 거래량, 변동률
- `GET /api/dashboard/unit` → 실시간 가격 차트 데이터
- `GET /api/dashboard/day` → 하루 통계 (평균, 최고, 최저)

### 💰 거래 기능
- `POST /api/trade/buy` → 주식 매수
- `POST /api/trade/sell` → 주식 매도
- `GET /api/trades/me` → 내 거래 내역

### 📝 게시판 기능
- `GET /board/list` → 게시글 목록
- `GET /board/detail/:id` → 게시글 상세
- `POST /board/write` → 게시글 작성
- `POST /board/edit/:id` → 게시글 수정
- `POST /board/delete/:id` → 게시글 삭제

---

## 3. 데이터베이스 및 SQL 활용

### 📌 사용 테이블

#### 👤 Users (사용자)
- id (PK)
- user_id (UNIQUE)
- password
- balance (기본값: 1,000,000)
- stock (보유 주식 수)

#### 📝 Posts (게시글)
- id (PK)
- user_id
- trade_id (거래 연결)
- title, content, writer

#### 💸 Trades (거래 기록)
- id (PK)
- user_id
- type (BUY / SELL)
- price


### 💡 주요 SQL

```sql
SELECT balance, stock FROM users WHERE user_id = ?
```
```sql
SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC
```
```sql
SELECT p.*, t.type, t.price
FROM posts p
LEFT JOIN trades t ON p.trade_id = t.id
```
```sql
SELECT price FROM market_data ORDER BY id DESC LIMIT 1
```

---

## 4. 인프라 및 배포 기록

### ☁️ GCP
- VM 인스턴스 생성 후 Node.js 서버 실행
- MariaDB 설치 및 DB 구성

### 🌐 Cloudflare
- 도메인 연결 및 HTTPS 적용
- 외부 접근 가능하도록 설정

---

## 5. 트러블슈팅 (문제 해결 기록)

### ❌ 사례 1: 토큰 기반 데이터 조회 실패
- 문제: 로그인 후에도 사용자 정보가 조회되지 않음  
- 원인: Authorization 헤더 누락  
- 해결: JWT middleware (`authMiddleware`) 구현  


### ❌ 사례 2: 기존 코드 수정 과정에서 DB 반영 오류
- 문제: 기존 코드 구조를 수정하면서 DB 값이 정상적으로 반영되지 않음
- 원인: 기존 하드코딩 데이터와 DB 기반 데이터 흐름이 충돌  
- 해결: API 기반으로 데이터 흐름을 재구성하고, /api/user/me를 통해 실제 DB 값을 가져오도록 수정


### ❌ 사례 3: 게시판 권한 문제
- 문제: 다른 사용자가 글 수정 가능  
- 해결: JWT user_id와 게시글 user_id 비교 로직 추가  

---

## 6. 최종 회고

### 👍 배운 점
- JWT 기반 인증 흐름 이해  
- 프론트-백엔드-DB 연결 구조 경험  
- 실시간 데이터 처리 및 상태 관리  

### 🔥 아쉬운 점
- UI/UX 부족 (기존 코드 수정)
- 예외 처리 부족 (대시보드 및 다른 페이지 접근 제어 부분)
- 시간 부족으로 인한 시장 데이터 단순 구현  

### 🚀 개선 계획
- 차트 고도화 (캔들차트)  
- 자산 그래프 추가
- 실제 데이터 기반 그래프 구성
- 댓글 기능 추가

---

## 🧠 한줄 정리
> 인증 + 투자 로직 + 게시판을 통합한 풀스택 웹 서비스
