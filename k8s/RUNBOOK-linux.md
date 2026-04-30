# Runbook Kubernetes (Linux / macOS / Git Bash) — PokemonDrafter

Commandes pour déployer et dépanner l'application sur minikube depuis un shell **bash** (Linux, macOS, ou Git Bash sur Windows).

> Pour PowerShell, voir [RUNBOOK-windows.md](RUNBOOK-windows.md).

---

## 1. Démarrer minikube

```bash
minikube start --memory=4096 --cpus=4
```

## 2. Construire les images dans le daemon Docker de minikube

```bash
eval $(minikube docker-env)

docker build -t gateway-service:latest      ./APIGatewayService
docker build -t pokemon-service:latest      ./PokemonService
docker build -t combat-service:latest       ./CombatService
docker build -t chat-service:latest         ./ChatService
docker build -t logs-service:latest         ./LogsService
docker build -t front-general-service:latest ./FrontGeneralService
docker build -t front-red-service:latest    ./FrontColorService
docker build -t front-blue-service:latest   ./FrontColorService
```

## 3. Créer le namespace et appliquer le manifest

```bash
kubectl create namespace pokemon-drafter
kubectl apply -f k8s/manifest.yml
```

## 4. Ouvrir les port-forwards (IMPORTANT — conserve les mêmes URLs navigateur)

## wait a while so the pods run and after run this command:

```bash
./k8s/port-forward.sh
```

Ce script reproduit le mapping de ports du `docker-compose.yml` (4200, 4201, 4202, 8000, 8080, 8006). Sans ça, les URLs hardcodées dans le frontend ne joindront pas les services.

## 5. Surveiller les pods

```bash
kubectl get pods -n pokemon-drafter -w
```

## 6. À la fin de la session — libérer le shell de minikube

À exécuter une fois que tu as fini de builder/déployer, pour que `docker` reparle au daemon hôte (Docker Desktop) :

```bash
eval $(minikube docker-env --unset)
```

## 7. Diagnostic d'un pod qui crashe

```bash
kubectl describe pod -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter --previous
kubectl describe pod -l app=<service-name> -n pokemon-drafter | grep -A10 "Readiness"
```

## 8. Reset Kafka si crash en boucle

```bash
kubectl delete deployment kafka -n pokemon-drafter
kubectl delete pvc kafka-pvc -n pokemon-drafter &
kubectl delete pod -l app=kafka -n pokemon-drafter --force --grace-period=0
sleep 10
kubectl apply -f k8s/manifest.yml
kubectl get pvc -n pokemon-drafter
kubectl logs -l app=kafka -n pokemon-drafter -f
```

## 9. ReplicaSets en double

```bash
kubectl get replicasets -n pokemon-drafter
kubectl scale replicaset <old-replicaset-name> --replicas=0 -n pokemon-drafter
# ou
kubectl rollout restart deployment/<service-name> -n pokemon-drafter
```

## 10. État global

```bash
kubectl get all -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
```

## 11. Tout détruire

```bash
kubectl delete namespace pokemon-drafter
minikube stop
```
