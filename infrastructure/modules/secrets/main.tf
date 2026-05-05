variable "project" { type = string }
variable "environment" { type = string }
variable "db_username" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "db_name" { type = string; default = "hcms" }

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.project}/${var.environment}/db/credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    dbname   = var.db_name
  })
}

output "db_secret_arn"  { value = aws_secretsmanager_secret.db.arn }
output "db_secret_name" { value = aws_secretsmanager_secret.db.name }
