variable "environment"       { type = string }
variable "vpc_id"            { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "alb_sg_id"         { type = string }
variable "certificate_arn" {
  type    = string
  default = ""
}

resource "aws_lb" "main" {
  name               = "visioncraft-${var.environment}"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
  security_groups    = [var.alb_sg_id]
  tags = { Name = "visioncraft-${var.environment}-alb" }
}

resource "aws_lb_target_group" "api_gateway" {
  name        = "visioncraft-${var.environment}-api-gw"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }

  tags = { Name = "visioncraft-${var.environment}-api-gateway-tg" }
}

# Port-80 listener:
#   - No cert → forward directly to api-gateway (plain HTTP for QA)
#   - Cert provided → redirect to HTTPS (production)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = var.certificate_arn != "" ? "redirect" : "forward"
    target_group_arn = var.certificate_arn == "" ? aws_lb_target_group.api_gateway.arn : null

    dynamic "redirect" {
      for_each = var.certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

# HTTPS listener — only created when a certificate is provided
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_gateway.arn
  }
}

output "alb_dns_name"           { value = aws_lb.main.dns_name }
output "alb_arn"                { value = aws_lb.main.arn }
output "api_gateway_tg_arn"     { value = aws_lb_target_group.api_gateway.arn }
