# Runbook Kubernetes (Windows PowerShell) — PokemonDrafter

Commandes pour déployer et dépanner l'application sur minikube depuis **PowerShell** (Windows).

> Pour Linux / macOS / Git Bash, voir [RUNBOOK-linux.md](RUNBOOK-linux.md).

---

## 1. Démarrer minikube et activer l'Ingress

```powershell
minikube start --memory=4096 --cpus=4
minikube addons enable ingress
kubectl wait --namespace ingress-nginx --for=condition=ready pod `
  --selector=app.kubernetes.io/component=controller --timeout=300s
```

Attendre que le contrôleur Ingress soit prêt avant l'étape 3 : sinon `kubectl apply` échoue sur le webhook de l'Ingress.

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

## 3. Déployer

Une seule commande, qui crée aussi le namespace (`k8s/00-namespace.yml` est appliqué en premier) :

```powershell
kubectl apply -f k8s/ -n pokemon-drafter
```

## 4. Configurer le DNS local

L'application répond sur ces noms, routés par l'Ingress :

| URL | Service |
|---|---|
| http://pokemon-drafter.local | Front général |
| http://red.pokemon-drafter.local | Front Rouge |
| http://blue.pokemon-drafter.local | Front Bleu |
| http://api.pokemon-drafter.local | Gateway (+ WebSocket chat sur `/api/chat`) |
| http://auth.pokemon-drafter.local | Keycloak |
| http://mail.pokemon-drafter.local | Mailpit (emails Keycloak) |

Avec le driver Docker, l'IP de minikube n'est pas joignable depuis Windows : passer par le tunnel. Dans un PowerShell **administrateur**, laissé ouvert :

```powershell
minikube tunnel
```

Puis, dans un PowerShell **administrateur**, ajouter les noms au fichier hosts :

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 pokemon-drafter.local red.pokemon-drafter.local blue.pokemon-drafter.local api.pokemon-drafter.local auth.pokemon-drafter.local mail.pokemon-drafter.local"
```

Ouvrir ensuite http://pokemon-drafter.local.

## 5. Surveiller les pods

```powershell
kubectl get pods -n pokemon-drafter -w
```

Keycloak est le plus long à démarrer (~1-2 min).

## 6. Modifier le realm Keycloak

Le realm a une seule source : `keycloak/realm-export.json` (utilisé tel quel par Docker Compose). Pour Kubernetes, régénérer le ConfigMap après chaque modification et commiter les deux fichiers. Le script est en bash : le lancer depuis Git Bash ou WSL.

```bash
./k8s/sync-realm.sh
```

Keycloak n'importe le realm qu'au premier démarrage avec une base vide : pour réimporter, supprimer le PVC Postgres (voir section 12).

## 7. À la fin de la session — libérer le shell de minikube

À exécuter une fois que tu as fini de builder/déployer, pour que `docker` reparle au daemon hôte (Docker Desktop) :

```powershell
minikube docker-env --shell powershell --unset | Invoke-Expression
```

## 8. Diagnostic d'un pod qui crashe

```powershell
kubectl describe pod -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter --previous
kubectl describe pod -l app=<service-name> -n pokemon-drafter | Select-String -Context 0,10 "Readiness"
```

## 9. Reset Kafka si crash en boucle

```powershell
kubectl delete deployment kafka -n pokemon-drafter
Start-Job { kubectl delete pvc kafka-pvc -n pokemon-drafter }
kubectl delete pod -l app=kafka -n pokemon-drafter --force --grace-period=0
Start-Sleep -Seconds 10
kubectl apply -f k8s/ -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
kubectl logs -l app=kafka -n pokemon-drafter -f
```

## 10. ReplicaSets en double

```powershell
kubectl get replicasets -n pokemon-drafter
kubectl scale replicaset <old-replicaset-name> --replicas=0 -n pokemon-drafter
# ou
kubectl rollout restart deployment/<service-name> -n pokemon-drafter
```

## 11. État global

```powershell
kubectl get all -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
kubectl get ingress -n pokemon-drafter
```

## 12. Reset Postgres (réimport du realm, bases vides)

```powershell
kubectl delete deployment postgres keycloak -n pokemon-drafter
kubectl delete pvc postgres-pvc -n pokemon-drafter
kubectl apply -f k8s/ -n pokemon-drafter
```

## 13. Tout détruire

```powershell
kubectl delete namespace pokemon-drafter
minikube stop
```

Arrêter `minikube tunnel` (Ctrl+C) et retirer la ligne `pokemon-drafter.local` du fichier hosts.
