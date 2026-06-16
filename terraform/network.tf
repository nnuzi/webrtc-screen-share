resource "aws_vpc" "wss" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "wss-vpc" }
}

resource "aws_subnet" "wss" {
  vpc_id                  = aws_vpc.wss.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  tags = { Name = "wss-subnet" }
}

resource "aws_internet_gateway" "wss" {
  vpc_id = aws_vpc.wss.id
  tags = { Name = "wss-igw" }
}

resource "aws_route_table" "wss" {
  vpc_id = aws_vpc.wss.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.wss.id
  }
  tags = { Name = "wss-rt" }
}

resource "aws_route_table_association" "wss" {
  subnet_id      = aws_subnet.wss.id
  route_table_id = aws_route_table.wss.id
}
