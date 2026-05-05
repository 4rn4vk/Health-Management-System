variable "project"          { type = string; default = "hcms" }
variable "environment"      { type = string; default = "production" }
variable "aws_region"       { type = string; default = "us-east-1" }
variable "db_username"      { type = string }
variable "db_password"      { type = string; sensitive = true }
variable "db_instance_class"{ type = string; default = "db.t3.micro" }
variable "db_multi_az"      { type = bool; default = true }
variable "backend_image"    { type = string }
variable "frontend_image"   { type = string }
variable "app_secret_key"   { type = string; sensitive = true }
