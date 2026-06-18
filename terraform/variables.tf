variable "aws_region" {
  description = "AWS region to deploy in"
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.micro"
}

variable "github_repo" {
  description = "GitHub repository path, e.g. lihroff/webrtc-screen-share"
}

variable "github_token" {
  description = "GitHub Personal Access Token with repo scope"
  sensitive   = true
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
}
