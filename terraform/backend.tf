terraform {
  backend "s3" {
    bucket         = "wss-terraform-state-298370269944"
    key            = "terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt     = true
    use_lockfile = true
  }
}
