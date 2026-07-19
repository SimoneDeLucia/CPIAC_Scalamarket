#!/bin/bash
# Aggiornamento di sistema
apt-get update -y
apt-get upgrade -y

# Installazione Docker
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Installazione k3s (Kubernetes lightweight)
# Su un vero ambiente cluster occorre distinguere lo script per il Master e per i Worker.
# Per semplicità in questa demo Terraform eseguiamo l'installazione base.
curl -sfL https://get.k3s.io | sh -

# Fine installazione
echo "K3s and Docker installed successfully" > /var/log/bootstrap_k8s.log
