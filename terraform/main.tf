############################################
# 레포 기본 설정 (caquick-be·caquick-admin-fe와 같은 정책)
############################################
data "github_repository" "this" {
  name = var.repository_name
}

resource "github_repository" "caquick_seller_fe" {
  name        = data.github_repository.this.name
  description = data.github_repository.this.description
  visibility  = data.github_repository.this.visibility

  allow_merge_commit     = true
  allow_squash_merge     = true
  allow_rebase_merge     = true
  allow_auto_merge       = true
  delete_branch_on_merge = true

  has_issues      = data.github_repository.this.has_issues
  has_projects    = data.github_repository.this.has_projects
  has_wiki        = data.github_repository.this.has_wiki
  has_discussions = data.github_repository.this.has_discussions

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [description, visibility, has_issues, has_projects, has_wiki, has_discussions, topics, homepage_url]
  }
}

resource "github_repository_vulnerability_alerts" "this" {
  repository = data.github_repository.this.name
}

############################################
# Branch Ruleset: main (운영 브랜치 — 머지 = 맥미니 빌드·OTA)
############################################
resource "github_repository_ruleset" "main_protection" {
  name        = "main-protection"
  repository  = data.github_repository.this.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/main"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = false
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }

    required_status_checks {
      strict_required_status_checks_policy = false

      required_check {
        context = "check"
      }
      required_check {
        context = "pr-title"
      }
      required_check {
        context = "coverage-report"
      }
      # CodeQL: 매트릭스 job 이름이 그대로 context
      required_check {
        context = "Analyze (javascript-typescript)"
      }
    }
  }
}

############################################
# Branch Ruleset: develop (통합 브랜치) — Admin은 릴리즈 후 fast-forward 동기화용으로 bypass
############################################
resource "github_repository_ruleset" "develop_protection" {
  name        = "develop-protection"
  repository  = data.github_repository.this.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/develop"]
      exclude = []
    }
  }

  bypass_actors {
    actor_id    = 5 # RepositoryRole: Admin
    actor_type  = "RepositoryRole"
    bypass_mode = "always"
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = false
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }

    required_status_checks {
      strict_required_status_checks_policy = false

      required_check {
        context = "check"
      }
      required_check {
        context = "pr-title"
      }
      required_check {
        context = "coverage-report"
      }
      required_check {
        context = "Analyze (javascript-typescript)"
      }
    }
  }
}

############################################
# 이슈 라벨: caquick-be 세트 복제 (`gh label list -R CaQuick/caquick-be`). GitHub 기본 라벨은 건드리지 않는다
############################################
locals {
  labels = {
    "⚙️ Setting"      = { color = "203a4e", description = "개발환경 세팅" }
    "✅ Test"         = { color = "008672", description = "테스트 관련" }
    "✨ Refactor"     = { color = "7057ff", description = "코드 리팩토링" }
    "⭐️ Feature"      = { color = "FBCA04", description = "기능 개발" }
    "🌏 Deploy"       = { color = "773360", description = "배포 관련" }
    "📄 Docs"         = { color = "0075ca", description = "문서 작성 및 수정" }
    "📈 Enhancement"  = { color = "a2eeef", description = "성능 개선" }
    "🔧 Fix"          = { color = "9bd96f", description = "디버깅 및 오류 해결" }
    "📦 Dependencies" = { color = "0366d6", description = "의존성 업데이트 (Dependabot 등)" }
    "🧱 Tech Debt"    = { color = "bfd4f2", description = "기술 부채 / 추후 마이그레이션 필요" }
    "🔒 Security"     = { color = "b60205", description = "보안 패치 / 취약점 대응" }
  }
}

resource "github_issue_label" "this" {
  for_each = local.labels

  repository  = data.github_repository.this.name
  name        = each.key
  color       = each.value.color
  description = each.value.description
}
