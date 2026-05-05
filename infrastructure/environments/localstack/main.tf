terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_requesting_account_id = true
  skip_metadata_api_check     = true

  endpoints {
    s3             = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
    logs           = "http://localhost:4566"
  }
}

# ── S3 bucket ──────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "documents" {
  bucket = "hcms-documents"
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

# ── CloudWatch log group ───────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "app" {
  name              = "/hcms/local/app"
  retention_in_days = 7
}

# ── Secrets Manager ────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db" {
  name = "hcms/db/credentials"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "hcms"
    password = "hcmspassword"
    dbname   = "hcms"
  })
}

output "s3_bucket"      { value = aws_s3_bucket.documents.bucket }
output "log_group_name" { value = aws_cloudwatch_log_group.app.name }
output "db_secret_name" { value = aws_secretsmanager_secret.db.name }
