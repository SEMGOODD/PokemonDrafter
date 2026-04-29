# Runbook Kubernetes (Windows PowerShell) — PokemonDrafter

Commandes pour déployer et dépanner l'application sur minikube depuis **PowerShell** (Windows).

> Pour Linux / macOS / Git Bash, voir [RUNBOOK-linux.md](RUNBOOK-linux.md).

---

## 1. Démarrer minikube

```powershell
minikube start --memory=4096 --cpus=4
```

## 2. Construire les images dans le daemon Docker de minikube

`minikube docker-env` produit du shell. En PowerShell on demande la variante PowerShell et on l'exécute via `Invoke-Expression` (alias `iex`).

```powershell
minikube docker-env --shell powershell | Invoke-Expression

docker build -t gateway-service:latest       ./APIGatewayService
docker build -t pokemon-service:latest       ./PokemonService
docker build -t combat-service:latest        ./CombatService
docker build -t chat-service:latest          ./ChatService
docker build -t logs-service:latest          ./LogsService
docker build -t front-general-service:latest ./FrontGeneralService
docker build -t front-red-service:latest     ./FrontColorService
docker build -t front-blue-service:latest    ./FrontColorService
```

Vérifier que ton shell parle bien au daemon de minikube :

```powershell
$env:DOCKER_HOST   # doit afficher l'endpoint du daemon minikube
docker images      # doit lister les images que tu viens de builder
```

## 3. Créer le namespace et appliquer le manifest

```powershell
kubectl create namespace pokemon-drafter
kubectl apply -f k8s/manifest.yml
```

## 4. Ouvrir les port-forwards (IMPORTANT — conserve les mêmes URLs navigateur)

Le script `port-forward.sh` est bash uniquement. En PowerShell, lance les port-forwards en jobs background :

```powershell
$ns = "pokemon-drafter"
Start-Job -Name pf-front-general { kubectl port-forward -n $using:ns svc/front-general-service 4200:80 }
Start-Job -Name pf-front-red     { kubectl port-forward -n $using:ns svc/front-red-service     4201:80 }
Start-Job -Name pf-front-blue    { kubectl port-forward -n $using:ns svc/front-blue-service    4202:80 }
Start-Job -Name pf-gateway       { kubectl port-forward -n $using:ns svc/gateway-service       8000:80 }
Start-Job -Name pf-keycloak      { kubectl port-forward -n $using:ns svc/keycloak              8080:8080 }
Start-Job -Name pf-chat          { kubectl port-forward -n $using:ns svc/chat-service          8006:8000 }

Get-Job   # vérifier que tous les jobs tournent (State = Running)
```

Pour tout arrêter :

```powershell
Get-Job | Stop-Job
Get-Job | Remove-Job
```

> Alternative : si tu as Git Bash ou WSL, exécute `./k8s/port-forward.sh` dedans — c'est plus simple.

## 5. Surveiller les pods

```powershell
kubectl get pods -n pokemon-drafter -w
```

## 6. À la fin de la session — libérer le shell de minikube

À exécuter une fois que tu as fini de builder/déployer, pour que `docker` reparle au daemon hôte (Docker Desktop) :

```powershell
minikube docker-env --shell powershell --unset | Invoke-Expression
```

## 7. Diagnostic d'un pod qui crashe

```powershell
kubectl describe pod -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter --previous
kubectl describe pod -l app=<service-name> -n pokemon-drafter | Select-String -Context 0,10 "Readiness"
```

## 8. Reset Kafka si crash en boucle

```powershell
kubectl delete deployment kafka -n pokemon-drafter
Start-Job { kubectl delete pvc kafka-pvc -n pokemon-drafter }
kubectl delete pod -l app=kafka -n pokemon-drafter --force --grace-period=0
Start-Sleep -Seconds 10
kubectl apply -f k8s/manifest.yml
kubectl get pvc -n pokemon-drafter
kubectl logs -l app=kafka -n pokemon-drafter -f
```

## 9. ReplicaSets en double

```powershell
kubectl get replicasets -n pokemon-drafter
kubectl scale replicaset <old-replicaset-name> --replicas=0 -n pokemon-drafter
# ou
kubectl rollout restart deployment/<service-name> -n pokemon-drafter
```

## 10. État global

```powershell
kubectl get all -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
```

## 11. Tout détruire

```powershell
Get-Job | Stop-Job; Get-Job | Remove-Job
kubectl delete namespace pokemon-drafter
minikube stop
```
