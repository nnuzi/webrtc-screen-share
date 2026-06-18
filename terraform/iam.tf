resource "aws_iam_role" "wss" {
  name = "webrtc-screen-share-ec2"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
  tags = { Name = "wss-ec2-role" }
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.wss.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "wss" {
  name = "webrtc-screen-share-ec2"
  role = aws_iam_role.wss.name
  tags = { Name = "wss-ec2-profile" }
}
