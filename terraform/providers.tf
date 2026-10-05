# GitHub provider. 인증은 GITHUB_TOKEN 환경변수 — 로컬은 `export GITHUB_TOKEN=$(gh auth token)`.
provider "github" {
  owner = var.github_owner
}
