variable "aws_region" {
  description = "AWS Region per il deployment"
  default     = "eu-south-1"
}

variable "ami_id" {
  description = "AMI ID di Ubuntu Server (varia in base alla Region)"
  default     = "ami-0c7fca1de4020a16b" # Sostituire con l'AMI Ubuntu corretta per eu-south-1
}

variable "instance_type" {
  description = "Tipologia di istanza EC2 per i nodi K8s"
  default     = "t3.medium"
}
