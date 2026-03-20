# ─── Terraform Configuration ──────────────────────────────────────────────────
# Bootstrap AWS resources shared across environments:
#   - S3 buckets (generated images + uploads)
#   - CloudFront CDN distribution
#   - SES email identity
#
# Each environment (qa, prod) gets its own set of resources via workspaces.
# Usage:
#   terraform workspace new qa
#   terraform workspace new production
#   terraform apply -var-file=environments/qa.tfvars
#   terraform apply -var-file=environments/production.tfvars

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "ai-platform-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ai-image-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ─── Variables ────────────────────────────────────────────────────────────────

variable "environment" {
  type        = string
  description = "Environment name (qa, production)"
  validation {
    condition     = contains(["qa", "production"], var.environment)
    error_message = "Environment must be 'qa' or 'production'."
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "domain_name" {
  type        = string
  description = "Base domain (e.g. yourdomain.com)"
}

variable "ses_from_email" {
  type        = string
  description = "SES verified sender email"
}

# ─── S3 Buckets ──────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "generated_images" {
  bucket = "${var.environment}-ai-images-generated"
}

resource "aws_s3_bucket_versioning" "generated_images" {
  bucket = aws_s3_bucket.generated_images.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "generated_images" {
  bucket = aws_s3_bucket.generated_images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "generated_images" {
  bucket                  = aws_s3_bucket.generated_images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.environment}-ai-images-uploads"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "cleanup-temp-uploads"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }
}

# ─── CloudFront CDN ──────────────────────────────────────────────────────────

locals {
  cdn_subdomain = var.environment == "production" ? "cdn" : "${var.environment}-cdn"
  s3_origin_id  = "S3-${aws_s3_bucket.generated_images.id}"
}

resource "aws_cloudfront_origin_access_identity" "cdn" {
  comment = "OAI for ${var.environment} generated images"
}

data "aws_iam_policy_document" "s3_cdn_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.generated_images.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.cdn.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "generated_images_cdn" {
  bucket = aws_s3_bucket.generated_images.id
  policy = data.aws_iam_policy_document.s3_cdn_policy.json
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.generated_images.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cdn.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""
  comment             = "AI Platform CDN — ${var.environment}"

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# ─── SES ──────────────────────────────────────────────────────────────────────

resource "aws_ses_email_identity" "sender" {
  email = var.ses_from_email
}

# ─── Outputs ──────────────────────────────────────────────────────────────────

output "generated_images_bucket" {
  value = aws_s3_bucket.generated_images.bucket
}

output "uploads_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}
