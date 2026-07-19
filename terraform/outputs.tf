output "master_public_ip" {
  description = "IP Pubblico del nodo Master"
  value       = aws_instance.k8s_master.public_ip
}

output "worker_1_public_ip" {
  description = "IP Pubblico del nodo Worker 1"
  value       = aws_instance.k8s_worker_1.public_ip
}

output "worker_2_public_ip" {
  description = "IP Pubblico del nodo Worker 2"
  value       = aws_instance.k8s_worker_2.public_ip
}
