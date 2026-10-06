variable "aws_region" {
  description = "AWS Region per il deployment"
  default     = "eu-south-1"
}


variable "instance_type" {
  description = "Tipologia di istanza EC2 per i nodi K8s"
  default     = "t3.medium"
}
