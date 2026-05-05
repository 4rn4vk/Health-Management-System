variable "project" { type = string }
variable "environment" { type = string }
variable "alb_arn" { type = string }

resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project}/${var.environment}/app"
  retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project}-${var.environment}-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High 5XX error rate on ALB"
  dimensions = { LoadBalancer = var.alb_arn }
}

output "log_group_name" { value = aws_cloudwatch_log_group.app.name }
