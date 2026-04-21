variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "github_org" {
  type        = string
  description = "GitHub organisation or username (e.g. your-org)"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name (e.g. visioncraft)"
}

variable "aws_account_id" {
  type        = string
  description = "AWS account ID (12-digit number)"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "RDS master password — set via TF_VAR_db_password or -var flag, never commit"
}

variable "ses_from_email" {
  type        = string
  description = "SES verified sender email"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN for HTTPS on ALB (optional — uses CloudFront default cert if empty)"
}
