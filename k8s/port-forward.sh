#!/bin/bash
echo "Starting port forwards..."
kubectl port-forward -n pokemon-drafter svc/front-general-service 4200:80 &
kubectl port-forward -n pokemon-drafter svc/front-red-service 4201:80 &
kubectl port-forward -n pokemon-drafter svc/front-blue-service 4202:80 &
kubectl port-forward -n pokemon-drafter svc/gateway-service 8000:80 &
kubectl port-forward -n pokemon-drafter svc/keycloak 8080:8080 &
kubectl port-forward -n pokemon-drafter svc/chat-service 8006:8000 &
echo "Access the app at http://localhost:4200"
echo "Press Ctrl+C to stop all port forwards"
wait