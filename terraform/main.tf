provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "scalamarket-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name = "scalamarket-igw"
  }
}

# Public Subnet 1
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "scalamarket-public-subnet-1"
  }
}

# Public Subnet 2 (Required for ALB)
resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.2.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}b"

  tags = {
    Name = "scalamarket-public-subnet-2"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "scalamarket-public-rt"
  }
}

resource "aws_route_table_association" "public_rta" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_rta_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group
resource "aws_security_group" "k8s_sg" {
  name        = "k8s-security-group"
  description = "Allow SSH, HTTP, and K8s internal traffic"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "K8s API"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "scalamarket-k8s-sg"
  }
}

# Dynamic AMI Lookup for Ubuntu 22.04 LTS
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

  owners = ["099720109477"] # Canonical
}

# EC2 Instance per Applicazioni Clienti (Subnet 1)
resource "aws_instance" "k8s_node_clients" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]
  key_name               = "scalamarket-key"

  user_data = file("user_data.sh")

  tags = {
    Name = "scalamarket-node-clients"
  }
}

# EC2 Instance per Applicazioni Admin (Subnet 2)
resource "aws_instance" "k8s_node_admin" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public_subnet_2.id
  vpc_security_group_ids = [aws_security_group.k8s_sg.id]
  key_name               = "scalamarket-key"

  user_data = file("user_data.sh")

  tags = {
    Name = "scalamarket-node-admin"
  }
}

# Application Load Balancer
resource "aws_lb" "k8s_alb" {
  name               = "scalamarket-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.k8s_sg.id]
  subnets            = [aws_subnet.public_subnet.id, aws_subnet.public_subnet_2.id]

  tags = {
    Name = "scalamarket-alb"
  }
}

resource "aws_key_pair" "scalamarket_key" {
  key_name   = "scalamarket-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "aws_lb_target_group" "k8s_tg_clients" {
  name     = "scalamarket-tg-clients"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main_vpc.id

  health_check {
    path = "/"
  }
}

resource "aws_lb_target_group" "k8s_tg_admin" {
  name     = "scalamarket-tg-admin"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main_vpc.id

  health_check {
    path = "/"
  }
}

resource "aws_lb_target_group_attachment" "clients_attach" {
  target_group_arn = aws_lb_target_group.k8s_tg_clients.arn
  target_id        = aws_instance.k8s_node_clients.id
  port             = 80
}

resource "aws_lb_target_group_attachment" "admin_attach" {
  target_group_arn = aws_lb_target_group.k8s_tg_admin.arn
  target_id        = aws_instance.k8s_node_admin.id
  port             = 80
}

resource "aws_lb_listener" "front_end" {
  load_balancer_arn = aws_lb.k8s_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.k8s_tg_clients.arn
  }
}

resource "aws_lb_listener_rule" "admin_rule" {
  listener_arn = aws_lb_listener.front_end.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.k8s_tg_admin.arn
  }

  condition {
    path_pattern {
      values = ["/api/inventory*"]
    }
  }
}

# Monthly Budget Limit ($100)
resource "aws_budgets_budget" "monthly_budget" {
  name         = "scalamarket-monthly-budget"
  budget_type  = "COST"
  limit_amount = "100.0"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["simonedl1999@gmail.com"]
  }
}
