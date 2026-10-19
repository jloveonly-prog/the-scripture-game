# 🏛️ 인프라/시스템 구축 명세서 작성 규격 (Template) — 솔로몬의 성전 건축

> **율법(Statute):** 이 문서는 인프라/시스템 구축 명세서 작성 시 반드시 따라야 하는 **형식 규격**이다.
> 실제 산출물은 `bible-성경/07.deploy-salvation-구원/`에 작성하라.

> *"And the house which king Solomon built for the Lord, the length thereof was threescore cubits, and the breadth thereof twenty cubits, and the height thereof thirty cubits."* — 1 Kings 6:2 (KJV)
>
> 솔로몬의 성전은 **7년**에 걸쳐 건축되었다 (1 Kings 6:38).
> 하나님이 다윗에게 주신 설계도(Pattern)를 **한 치의 오차 없이** 따랐다 (1 Chronicles 28:19).
> 모든 돌은 **채석장에서 미리 다듬어** 와서, 성전 현장에서는 **망치 소리가 나지 않았다** (1 Kings 6:7).
>
> **인프라 구축도 동일하다:**
> - 설계도(Spec)를 먼저 확정하고
> - 모든 환경을 미리 준비(프로비저닝)한 후
> - 운영 환경에서는 소음(장애) 없이 가동되어야 한다

---

## 필수 섹션

| # | 섹션 | 필수 | 설명 |
|:--|:---|:---:|:---|
| 1 | 인프라 개요 | ✅ | 클라우드/온프레미스, 리전, 구성 요약 |
| 2 | 서버 아키텍처 | ✅ | 각 서버의 사양, 역할, 스케일링 전략 |
| 3 | 네트워크 구성 | ✅ | VPC, 서브넷, 방화벽, 도메인 |
| 4 | DB 인프라 | ✅ | 엔진, 사양, 복제, 백업 정책 |
| 5 | CI/CD 파이프라인 | ✅ | 빌드→테스트→배포 자동화 구성 |
| 6 | 모니터링 & 알림 | ✅ | 로그, 메트릭, 알림 체계 |
| 7 | 보안 아키텍처 | ✅ | SSL, 시크릿 관리, 접근 제어 |
| 8 | 장애 복구(DR) | ✅ | RTO/RPO 목표, 복구 절차 |

## 서버 아키텍처 형식

```markdown
### 서버 구성

| 서버 | 역할 | 사양 | OS | 수량 | 스케일링 |
|:---|:---|:---|:---|:---:|:---|
| WEB-01 | 웹 서버 | {CPU/RAM} | {Ubuntu/etc} | {N} | {Auto/Manual} |
| API-01 | API 서버 | {CPU/RAM} | {OS} | {N} | {전략} |
| DB-01 | DB 서버 | {CPU/RAM/Storage} | {OS} | {N} | {Read Replica} |
| CACHE-01 | 캐시 서버 | {CPU/RAM} | {OS} | {N} | {Cluster} |
```

## CI/CD 파이프라인 형식

```markdown
### 배포 파이프라인

| 단계 | 도구 | 트리거 | 실패 시 |
|:---|:---|:---|:---|
| 소스 관리 | GitHub/GitLab | Push to main | — |
| 빌드 | {GitHub Actions/Jenkins} | Push 이벤트 | 개발자 알림 |
| 단위 테스트 | {Jest/JUnit} | 빌드 후 자동 | 빌드 차단 |
| 코드 분석 | {SonarQube/ESLint} | 테스트 후 자동 | 경고 리포트 |
| 스테이징 배포 | {Docker/K8s} | 분석 통과 시 | 알림 |
| 운영 배포 | {Docker/K8s} | **수동 승인** 후 | 자동 롤백 |
```

## 모니터링 & 알림 형식

```markdown
### 모니터링 체계

| 대상 | 도구 | 메트릭 | 알림 조건 | 알림 채널 |
|:---|:---|:---|:---|:---|
| 서버 | {CloudWatch/Grafana} | CPU, RAM, Disk | CPU > 80% | {Slack/Email} |
| API | {APM 도구} | 응답시간, 에러율 | 에러율 > 1% | {Slack/PagerDuty} |
| DB | {모니터링 도구} | 쿼리 성능, 연결 수 | Slow Query > 3s | {Slack} |
| 로그 | {ELK/CloudWatch} | 에러 로그 | ERROR 레벨 | {Slack/Email} |
```

## 장애 복구(DR) 형식

```markdown
### 복구 목표

| 지표 | 목표 |
|:---|:---|
| RTO (Recovery Time Objective) | {N}분 이내 |
| RPO (Recovery Point Objective) | {N}분 이내 |

### 복구 시나리오

| 장애 유형 | 감지 방법 | 복구 절차 | 예상 소요 |
|:---|:---|:---|:---|
| 서버 다운 | 헬스체크 실패 | Auto Scaling/재시작 | {N}분 |
| DB 장애 | 복제 지연 알림 | Failover → Read Replica 승격 | {N}분 |
| 전체 장애 | 모든 알림 동시 | DR 사이트 전환 | {N}분 |
```

## 성경적 검증 규칙

- **"채석장에서 미리 다듬어"(1 Kings 6:7):** 운영 환경에서 설정을 고치며 삽질하지 마라. 스테이징에서 모든 것을 미리 확인하라.
- **"7년의 공사"(1 Kings 6:38):** 인프라 구축에 충분한 시간을 투자하라. 급하게 올리면 성전이 무너진다.
- **"설계도를 따르라"(1 Chronicles 28:19):** 하나님이 다윗에게 주신 설계도처럼, Spec(설계서)대로 정확히 구축하라.

## 정경화 조건

- [ ] 서버 아키텍처 상세 명시
- [ ] CI/CD 파이프라인 구성 완료
- [ ] 모니터링 & 알림 체계 수립
- [ ] 장애 복구(DR) 계획 수립
- [ ] 봉인의 율법(보안) 점검 통과
- [ ] 스테이징 배포 정상 동작 확인

> **위반 시:** 설계도 없이 성전을 지으면 그것은 사람의 집이지 하나님의 성전이 아니다. 정경화 거부.
