variable "aws_region" {
  description = "AWS region to deploy in"
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.micro"
}

variable "github_repo" {
  description = "GitHub repository path, e.g. nnuzi/webrtc-screen-share"
}

variable "github_token" {
  description = "GitHub Personal Access Token with repo scope"
  sensitive   = true
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
}

variable "ssh_allowed_ip" {
  description = "IP CIDR allowed to SSH into the EC2 instance"
  type        = string
  default     = "0.0.0.0/0"
}
