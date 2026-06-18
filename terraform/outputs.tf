output "eip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.wss.public_ip
}

output "ssh" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${path.module}/webrtc-screen-share-key.pem ubuntu@${aws_eip.wss.public_ip}"
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.wss.repository_url
}
