resource "aws_ecr_repository" "wss" {
  name                 = "webrtc-screen-share"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = { Name = "wss-ecr" }
}

resource "aws_ecr_lifecycle_policy" "wss" {
  repository = aws_ecr_repository.wss.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 2 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 2
      }
      action = { type = "expire" }
    }]
  })
}
