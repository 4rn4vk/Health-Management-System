variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_secret_arn" { type = string }
variable "instance_class" { type = string; default = "db.t3.micro" }
variable "multi_az" { type = bool; default = false }

data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = var.db_secret_arn
}

locals {
  creds = jsondecode(data.aws_secretsmanager_secret_version.db_creds.secret_string)
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project}-${var.environment}-rds-"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "main" {
  identifier             = "${var.project}-${var.environment}-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.instance_class
  allocated_storage      = 20
  db_name                = local.creds.dbname
  username               = local.creds.username
  password               = local.creds.password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = var.multi_az
  skip_final_snapshot    = true
  storage_encrypted      = true
  tags = { Project = var.project; Environment = var.environment }
}

output "db_endpoint" { value = aws_db_instance.main.endpoint }
output "db_name"     { value = aws_db_instance.main.db_name }
