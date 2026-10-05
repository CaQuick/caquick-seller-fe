# Terraform — GitHub 레포 설정

`CaQuick/caquick-seller-fe`의 머지 옵션, `main`·`develop` Ruleset, 이슈 라벨을 코드로 관리한다. 정책은 caquick-be·caquick-admin-fe와 같다.

- 필수 status check: `check` · `pr-title` · `coverage-report` · `Analyze (javascript-typescript)`
- `develop`은 Repository Admin이 bypass 가능(릴리즈 뒤 main으로 fast-forward 동기화용). `main`은 bypass 없음.
- 라벨은 caquick-be 세트 11개(`github_issue_label`, for_each). GitHub 기본 라벨(bug·documentation 등)은 관리 밖이라 남아 있어도 plan에 뜨지 않는다.

```bash
brew install terraform
export GITHUB_TOKEN=$(gh auth token)   # repo(classic) 또는 Administration: write(fine-grained)
cd terraform
terraform init
terraform import github_repository.caquick_seller_fe caquick-seller-fe   # 이미 있는 레포를 state에 연결(최초 1회)
terraform plan
terraform apply
```

state는 로컬(`*.tfstate`, gitignore). state를 잃으면 레포 import를 다시 하고, Ruleset은 `gh api repos/CaQuick/caquick-seller-fe/rulesets --jq '.[] | {id, name}'`로 id를 찾아 `terraform import github_repository_ruleset.<name> caquick-seller-fe:<id>`, 라벨은 `terraform import 'github_issue_label.this["📦 Dependencies"]' 'caquick-seller-fe:📦 Dependencies'`.

러너·Environment `production`·시크릿은 Terraform 밖이다 — [infra/README.md](../infra/README.md).
