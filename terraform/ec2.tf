data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
  owners = ["099720109477"]
}

resource "aws_eip" "wss" {
  domain = "vpc"
  tags = { Name = "wss-eip" }
}

resource "aws_eip_association" "wss" {
  allocation_id = aws_eip.wss.id
  instance_id   = aws_instance.wss.id
}

resource "aws_instance" "wss" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.wss.id
  vpc_security_group_ids = [aws_security_group.wss.id]
  key_name               = aws_key_pair.wss.key_name

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    github_repo  = var.github_repo
    github_token = var.github_token
  })

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  tags = { Name = "webrtc-screen-share" }
}
