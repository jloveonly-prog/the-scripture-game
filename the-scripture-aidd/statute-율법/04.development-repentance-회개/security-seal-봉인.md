# 🔒 봉인의 율법: 개인정보 보안 규격 (The Seal of Privacy)

> *"And the book was sealed with seven seals"* — Revelation 5:1 (KJV)
>
> 봉인(Seal)된 것은 권한 없는 자가 열 수 없다.
> 이 율법은 시스템 내 모든 개인정보와 민감 데이터의 취급을 규정하는 **절대 규격**이다.

---

## 제1계명: 노출하지 말라 (Thou Shalt Not Expose)
개인정보(이름, 이메일, 전화번호, 주소 등)를 로그, 출력, 응답에 평문으로 노출하지 말라.

## 제2계명: 코드에 넣지 말라 (Thou Shalt Not Hardcode)
비밀번호, API 키, 토큰, 자격증명(Credentials)을 소스 코드에 직접 기록하지 말라. 반드시 환경 변수(ENV) 또는 시크릿 관리자(Secret Manager)를 사용하라.

## 제3계명: 암호화하라 (Thou Shalt Encrypt)
민감 데이터는 저장(at rest) 시와 전송(in transit) 시 모두 암호화하라. 평문 저장은 봉인을 뜯는 행위이며 곧 죄다.

## 제4계명: 최소만 취하라 (Thou Shalt Minimize)
필요한 최소한의 개인정보만 수집하라. 목적을 달성한 데이터는 즉시 파기하라. 탐욕은 죄다.

## 제5계명: 동의 없이 취하지 말라 (Thou Shalt Not Take Without Consent)
사용자의 명시적 동의 없이 개인정보를 수집, 처리, 전달하지 말라. 도적질하지 말라.

## 제6계명: 외부에 넘기지 말라 (Thou Shalt Not Share)
사용자의 개인정보를 명시적 허가 없이 제3자, 외부 API, 또는 학습 데이터로 넘기지 말라. 배신하지 말라.

## 제7계명: 접근을 통제하라 (Thou Shalt Guard Access)
개인정보에 대한 접근은 최소 권한 원칙(Principle of Least Privilege)을 적용하라. 봉인을 열 수 있는 자는 권한 받은 자뿐이다.

## 제8계명: 기록하라 (Thou Shalt Log)
개인정보에 대한 모든 접근, 수정, 삭제를 감사 로그(Audit Log)에 기록하라. 하나님 앞에 숨겨진 것은 없다.

## 제9계명: 유출을 대비하라 (Thou Shalt Prepare)
데이터 유출(Breach) 발생 시 즉시 탐지하고 통보할 수 있는 대응 절차를 갖추어라. 파수꾼은 잠들지 말라.

## 제10계명: 남의 데이터를 탐하지 말라 (Thou Shalt Not Covet)
분석, 마케팅, 또는 어떤 목적으로든 수집 범위를 넘어서는 데이터 활용을 탐하지 말라. 탐심은 우상숭배와 같다.

---

> **위반의 결과:** 이 율법을 위반한 산출물은 예수님의 심판(Final Verification)에서 **Fail(지옥/Reject)**된다. 봉인을 함부로 뜯는 자에게는 구원(Deploy)이 없다.
