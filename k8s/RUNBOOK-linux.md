# Runbook Kubernetes (Linux / macOS / Git Bash) — PokemonDrafter

Commandes pour déployer et dépanner l'application sur minikube depuis un shell **bash** (Linux, macOS, ou Git Bash sur Windows).

> Pour PowerShell, voir [RUNBOOK-windows.md](RUNBOOK-windows.md).

---

## 1. Démarrer minikube et activer l'Ingress

```bash
minikube start --memory=4096 --cpus=4
minikube addons enable ingress
kubectl wait --namespace ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=300s
```

Attendre que le contrôleur Ingress soit prêt avant l'étape 3 : sinon `kubectl apply` échoue sur le webhook de l'Ingress.

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

## 3. Déployer

Une seule commande, qui crée aussi le namespace (`k8s/00-namespace.yml` est appliqué en premier) :

```bash
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

**Linux** : l'IP de minikube est joignable directement.

```bash
echo "$(minikube ip) pokemon-drafter.local red.pokemon-drafter.local blue.pokemon-drafter.local api.pokemon-drafter.local auth.pokemon-drafter.local mail.pokemon-drafter.local" | sudo tee -a /etc/hosts
```

**macOS** (driver Docker) : l'IP de minikube n'est pas joignable, passer par le tunnel. Laisser ce terminal ouvert :

```bash
minikube tunnel
```

puis pointer les noms sur `127.0.0.1` :

```bash
echo "127.0.0.1 pokemon-drafter.local red.pokemon-drafter.local blue.pokemon-drafter.local api.pokemon-drafter.local auth.pokemon-drafter.local mail.pokemon-drafter.local" | sudo tee -a /etc/hosts
```

**Git Bash sur Windows** : voir l'étape DNS de [RUNBOOK-windows.md](RUNBOOK-windows.md) (fichier hosts Windows + `minikube tunnel`).

Ouvrir ensuite http://pokemon-drafter.local.

## 5. Surveiller les pods

```bash
kubectl get pods -n pokemon-drafter -w
```

Keycloak est le plus long à démarrer (~1-2 min).

## 6. Modifier le realm Keycloak

Le realm a une seule source : `keycloak/realm-export.json` (utilisé tel quel par Docker Compose). Pour Kubernetes, régénérer le ConfigMap après chaque modification et commiter les deux fichiers :

```bash
./k8s/sync-realm.sh
```

Keycloak n'importe le realm qu'au premier démarrage avec une base vide : pour réimporter, supprimer le PVC Postgres (voir section 12).

## 7. À la fin de la session — libérer le shell de minikube

À exécuter une fois que tu as fini de builder/déployer, pour que `docker` reparle au daemon hôte (Docker Desktop) :

```bash
eval $(minikube docker-env --unset)
```

## 8. Diagnostic d'un pod qui crashe

```bash
kubectl describe pod -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter --previous
kubectl describe pod -l app=<service-name> -n pokemon-drafter | grep -A10 "Readiness"
```

## 9. Reset Kafka si crash en boucle

```bash
kubectl delete deployment kafka -n pokemon-drafter
kubectl delete pvc kafka-pvc -n pokemon-drafter &
kubectl delete pod -l app=kafka -n pokemon-drafter --force --grace-period=0
sleep 10
kubectl apply -f k8s/ -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
kubectl logs -l app=kafka -n pokemon-drafter -f
```

## 10. ReplicaSets en double

```bash
kubectl get replicasets -n pokemon-drafter
kubectl scale replicaset <old-replicaset-name> --replicas=0 -n pokemon-drafter
# ou
kubectl rollout restart deployment/<service-name> -n pokemon-drafter
```

## 11. État global

```bash
kubectl get all -n pokemon-drafter
kubectl get pvc -n pokemon-drafter
kubectl get ingress -n pokemon-drafter
```

## 12. Reset Postgres (réimport du realm, bases vides)

```bash
kubectl delete deployment postgres keycloak -n pokemon-drafter
kubectl delete pvc postgres-pvc -n pokemon-drafter
kubectl apply -f k8s/ -n pokemon-drafter
```

## 13. Tout détruire

```bash
kubectl delete namespace pokemon-drafter
minikube stop
```

Retirer aussi la ligne `pokemon-drafter.local` ajoutée dans `/etc/hosts`.
