terraform {
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "hcms-tfstate"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

module "secrets" {
  source      = "../../modules/secrets"
  project     = var.project
  environment = var.environment
  db_username = var.db_username
  db_password = var.db_password
}

module "networking" {
  source      = "../../modules/networking"
  project     = var.project
  environment = var.environment
}

module "storage" {
  source      = "../../modules/storage"
  project     = var.project
  environment = var.environment
  bucket_name = "${var.project}-${var.environment}-documents"
}

module "database" {
  source              = "../../modules/database"
  project             = var.project
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  db_secret_arn       = module.secrets.db_secret_arn
  instance_class      = var.db_instance_class
  multi_az            = var.db_multi_az
}

module "compute" {
  source              = "../../modules/compute"
  project             = var.project
  environment         = var.environment
  aws_region          = var.aws_region
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  private_subnet_ids  = module.networking.private_subnet_ids
  backend_image       = var.backend_image
  frontend_image      = var.frontend_image
  db_url              = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${module.database.db_endpoint}/${module.database.db_name}"
  secret_key          = var.app_secret_key
  s3_bucket_name      = module.storage.bucket_name
}

module "monitoring" {
  source      = "../../modules/monitoring"
  project     = var.project
  environment = var.environment
  alb_arn     = module.compute.alb_dns_name
}

output "alb_dns_name" { value = module.compute.alb_dns_name }
