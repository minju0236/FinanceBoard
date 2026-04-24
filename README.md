# 💸 지출 관리 웹 서비스 (CRUD + JWT 인증)

## 1. 프로젝트 개요

### 배포 화면
https://likely-base-lan-apartment.trycloudflare.com/
<img width="1918" height="1017" alt="화면 캡처 2026-04-24 200547" src="https://github.com/user-attachments/assets/e622815d-d4d5-4c6a-ad05-d0841e7234b6" />


- **수행 주제**: JWT 기반 인증과 사용자 권한 제어가 적용된 지출 관리 웹 서비스  
- **배포 주소**: (배포 URL 입력)  
- **사용 기술**
  - Frontend: React, CSS
  - Backend: Node.js (Express)
  - Database: MariaDB
  - 인증: JWT (JSON Web Token)
  - 인프라: (예: Render, Vercel, GCP 등)

---

## 2. 백엔드 구성 및 라우팅

`server.js`를 중심으로 REST API를 구성하였으며, JWT 인증을 통해 사용자별 데이터 접근을 제어하였다.

### 🔐 인증 관련
- `POST /api/signup` → 회원가입
- `POST /api/login` → 로그인 및 JWT 발급

---

### 💸 지출 관리 기능
- `GET /api/expenses` → 전체 지출 목록 조회
- `GET /api/expenses/:id` → 특정 지출 상세 조회 (JWT 필요)
- `POST /api/expenses` → 지출 등록 (JWT 필요)
- `PUT /api/expenses/:id` → 지출 수정 (작성자만 가능)
- `DELETE /api/expenses/:id` → 지출 삭제 (작성자만 가능)

---

## 3. 데이터베이스 및 SQL 활용

### 📌 Users (사용자)

| 필드명       | 타입           | 설명                | 제약조건 |
|-------------|---------------|---------------------|---------|
| id          | INT           | 사용자 ID           | PK, AUTO_INCREMENT |
| email       | VARCHAR(50)   | 이메일              | NOT NULL, UNIQUE |
| name        | VARCHAR(50)   | 사용자 이름         | NOT NULL |
| password    | VARCHAR(100)  | 비밀번호 (암호화)   | NOT NULL |
| created_at  | TIMESTAMP     | 생성 시간           | DEFAULT CURRENT_TIMESTAMP |
| updated_at  | TIMESTAMP     | 수정 시간           | 자동 업데이트 |

---

### 📌 Expenses (지출)

| 필드명       | 타입           | 설명                | 제약조건 |
|-------------|---------------|---------------------|---------|
| id          | INT           | 지출 ID             | PK, AUTO_INCREMENT |
| user_id     | INT           | 작성자 ID           | FK (users.id), NOT NULL |
| category    | VARCHAR(20)   | 지출 카테고리       | NOT NULL |
| title       | VARCHAR(50)   | 지출 제목           | NOT NULL |
| description | TEXT          | 지출 설명           | NOT NULL |
| amount      | DECIMAL(10,2) | 지출 금액           | NOT NULL |
| created_at  | TIMESTAMP     | 생성 시간           | DEFAULT CURRENT_TIMESTAMP |
| updated_at  | TIMESTAMP     | 수정 시간           | 자동 업데이트 |

---

### 🔗 관계 (Relationship)

- Users (1) : (N) Expenses  
- 하나의 사용자는 여러 개의 지출 데이터를 가질 수 있음  
- `expenses.user_id → users.id` (외래키)


---

### 💡 주요 SQL

```sql
SELECT * FROM expenses ORDER BY id DESC;
```

```sql
SELECT id, user_id, category, title, description, amount
FROM expenses
WHERE id = ?;
```

```sql
INSERT INTO expenses (user_id, category, title, description, amount)
VALUES (?, ?, ?, ?, ?);
```

```sql
UPDATE expenses
SET category = ?, title = ?, description = ?, amount = ?
WHERE id = ? AND user_id = ?;
```

```sql
DELETE FROM expenses
WHERE id = ? AND user_id = ?;
```

## 4. 인프라 및 배포 기록

### ☁️ 서버
- Node.js 기반 Express 서버 구축  
- REST API 구성 및 JWT 인증 적용  

### 🗄️ 데이터베이스
- MariaDB 사용  
- 사용자 및 지출 데이터 관리  

### 🌐 배포
- 백엔드: (예: Render / GCP VM)  
- 프론트엔드: (예: Vercel)  
- API 통신 및 CORS 설정 적용  

---

## 5. 트러블슈팅 (문제 해결 기록)

### ❌ 사례 1: 특정 지출 조회 시 데이터 불러오기 실패
- 문제: 클릭 시 상세 페이지에서 데이터가 조회되지 않음  
- 원인: 리스트 API에서 id를 반환하지 않아 undefined로 요청됨  
- 해결: `/api/expenses` 응답에 id 필드 추가  

---

### ❌ 사례 2: 상세 조회 useEffect가 실행되지 않는 문제
- 문제: 콘솔이 찍히지 않고 fetch 요청도 실행되지 않는 것처럼 보임, 그래서 `navigate`때 값을 같이 넘겼으나 여전함
- 원인: `if (!id) return;` 조건에서 id가 undefined라 useEffect 내부 로직이 실행되지 않음 
- 해결: id 전달 방식을 `location.state`에서 URL 파라미터(useParams)로 변경하여 항상 값이 유지되도록 수정

---

### ❌ 사례 3: 조회 API 응답은 정상이나 화면이 비어 있음
- 문제: 서버에서 데이터를 정상적으로 받아왔음에도 `form` 값이 채워지지 않음
- 원인: 서버는 단일 객체를 반환했지만, 프론트에서 이를 배열로 착각하여 `data[0]`으로 접근함 (배열로 생각해서 에러남)
- 해결: 응답 데이터를 배열이 아닌 객체로 인식하고 `data` 그대로 사용하도록 수정

---

## 6. 최종 회고

### 👍 배운 점
- JWT 기반 로그인이나 권한 처리 흐름을 직접 연결해보면서 전체 구조를 이해하게 됨  
- React에서 상태(mode 같은 거)로 화면을 바꾸는 흐름을 실제로 써보면서 익숙해짐  
- 프론트–백엔드–DB가 어떻게 이어지는지 직접 경험해본 게 가장 컸던 것 같음  
- 이번에는 AI를 최대한 덜 쓰려고 하면서 직접 찾아보고 구현하는 경험을 많이 해봄  

---

### 🔥 잘한 점
- 이번 해커톤은 AI를 최대한 덜 써보자는 취지로 프론트는 거의 60% 이상, 백엔드는 40% 정도 직접 구현하면서 단순히 결과를 만드는 것보다, 흐름을 이해하는 게 훨씬 중요하다는 걸 느낌
- 모르는 부분은 그냥 넘기지 않고 찾아보거나 수업 코드 참고하면서 해결하려고 함  
- 테이블 생성도 AI에 맡기지 않고 직접 짜보려고 했고, ERD CLOUD로 ERD 설계도 해봄  
- 디자인은 AI로 기본 틀만 잡고 피그마에서 직접 수정하여 빠른 시간 안에 만족스러운 결과물이 나
- 예상 시간보다 2시간 넘게 초과 되었지만 원래 구현해야 했던 JWT 토큰 기반 로그인 회원가입과 CRUD 전체 흐름 다 구현함  

---

### 😅 아쉬운 점
- 생각보다 시간이 많이 걸려서 개발 속도에 대한 아쉬움이 있음  
- 특히 update 부분에서 id 기반으로 조회하고 수정하는 흐름이 어려워서 그 부분은 AI를 많이 참고함
- React 프로젝트는 그동안 많이 해봐서 직접 구현이 괜찮았으나, Node 코드 작성이 아무래도 많이 어려웠음

---

### 🚀 개선 계획
- 검색, 필터 기능 추가하기  
- TailWind와 Next.js로 확장하기
- 나의 지출을 모아볼 수 있는 페이지 만들기

---

## 🧠 한줄 정리
> JWT 인증과 사용자 권한 제어를 기반으로 한 지출 관리 풀스택 웹 서비스
