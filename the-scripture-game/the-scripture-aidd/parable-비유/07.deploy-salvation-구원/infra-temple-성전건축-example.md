# 🏛️ 인프라/시스템 구축 명세서 — 성경 검색 앱 (Example)

> **비유(Parable):** 이 문서는 실제 프로젝트에서 인프라 명세서가 어떻게 작성되는지 보여주는 **참조 예시**이다.
> 실제 산출물 작성 시 이것을 참고하고, 규격은 `statute-율법/07/infra-temple-성전건축-template.md`를 따르라.

---

## 1. 인프라 개요

| 항목 | 내용 |
|:---|:---|
| 프로젝트 | The Scripture Search (성경 검색 앱) |
| 클라우드 | AWS (ap-northeast-2, Seoul) |
| 아키텍처 | 2-Tier (API + DB), 컨테이너 기반 |
| 예상 사용자 | 초기 1,000 DAU |

---

## 2. 서버 아키텍처

| 서버 | 역할 | 사양 | OS | 수량 | 스케일링 |
|:---|:---|:---|:---|:---:|:---|
| WEB/API | Nginx + Node.js API | t3.medium (2vCPU, 4GB) | Ubuntu 22.04 | 2 | ALB + Auto Scaling |
| DB | PostgreSQL 16 | db.t3.medium (2vCPU, 4GB, 100GB gp3) | Amazon RDS | 1 + Read Replica | Manual Failover |
| Cache | Redis 7 | cache.t3.micro (1vCPU, 0.5GB) | ElastiCache | 1 | — |

---

## 3. CI/CD 파이프라인

| 단계 | 도구 | 트리거 | 실패 시 |
|:---|:---|:---|:---|
| 소스 관리 | GitHub | Push to main | — |
| 빌드 | GitHub Actions | Push 이벤트 | 개발자 Slack 알림 |
| 단위 테스트 | Jest | 빌드 후 자동 | 빌드 차단 |
| 린트 | ESLint + Prettier | 테스트 후 자동 | 경고 리포트 |
| 스테이징 배포 | Docker → ECS (staging) | 분석 통과 시 | 알림 |
| 운영 배포 | Docker → ECS (production) | **수동 승인** 후 | 자동 롤백 |

```yaml
# .github/workflows/deploy.yml (간략)
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - run: docker build -t scripture-search .
      - run: aws ecs update-service --cluster prod --service api
```

---

## 4. 모니터링 & 알림

| 대상 | 도구 | 메트릭 | 알림 조건 | 채널 |
|:---|:---|:---|:---|:---|
| 서버 | CloudWatch | CPU, RAM, Disk | CPU > 80% 5분 | Slack #ops |
| API | CloudWatch Logs | 응답시간, 5xx 에러율 | 에러율 > 1% | Slack #ops |
| DB | RDS Performance Insights | 쿼리 성능, 연결 수 | Slow Query > 3s | Slack #ops |
| 검색 | Custom Metric | 검색 응답시간 | > 2s (SLA 위반) | Slack #ops |

---

## 5. 장애 복구(DR)

| 지표 | 목표 |
|:---|:---|
| RTO | 15분 이내 |
| RPO | 5분 이내 |

| 장애 유형 | 감지 | 복구 절차 | 소요 |
|:---|:---|:---|:---|
| API 서버 다운 | ALB 헬스체크 | Auto Scaling 자동 교체 | 3분 |
| DB 장애 | RDS 이벤트 알림 | Read Replica 승격 | 10분 |
| 전체 장애 | 모든 알림 동시 | 최신 스냅샷으로 복원 | 15분 |

---

## 6. 백업 정책

| 항목 | 방법 | 보관 | 기간 |
|:---|:---|:---|:---|
| DB | RDS 자동 스냅샷 (매일) | S3 (같은 리전) | 30일 |
| 소스 코드 | Git 태그 (v{버전}-pre-deploy) | GitHub | 영구 |
| 환경 변수 | AWS Systems Manager Parameter Store | AWS | 버전 관리 |

> ✅ 솔로몬의 성전처럼 — 모든 돌을 미리 다듬어 놓았다. 현장에서 망치 소리가 나지 않는다.
