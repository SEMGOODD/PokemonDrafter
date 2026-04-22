List of commands to use for applying the kubernetes configuration:

1. START MINIKUBE
minikube start --memory=4096 --cpus=4

2. BUILD IMAGES INSIDE MINIKUBE'S DOCKER
eval $(minikube docker-env)
docker build -t gateway-service:v2 ./APIGatewayService
docker build -t combat-service:v4 ./CombatService
docker build -t pokemon-service:v1 ./PokemonService
docker build -t chat-service:v1 ./ChatService
...

3. CREATE NAMESPACE AND DEPLOY
kubectl create namespace pokemon-drafter
kubectl apply -f k8s/manifest.yml

4. WATCH PODS UNTIL STABLE
kubectl get pods -n pokemon-drafter -w

5. IF A POD IS CRASHING - DIAGNOSE
kubectl describe pod -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter
kubectl logs -l app=<service-name> -n pokemon-drafter --previous
kubectl describe pod -l app=<service-name> -n pokemon-drafter | grep -A10 "Readiness"

6. IF KAFKA IS CRASHING - NUCLEAR RESET
kubectl delete deployment kafka -n pokemon-drafter
kubectl delete pvc kafka-pvc -n pokemon-drafter &
kubectl delete pod -l app=kafka -n pokemon-drafter --force --grace-period=0
sleep 10
kubectl apply -f k8s/manifest.yml

# Verify PVC is recreated and bound
kubectl get pvc -n pokemon-drafter

# Watch kafka specifically
kubectl logs -l app=kafka -n pokemon-drafter -f

7. IF DUPLICATE PODS (multiple ReplicaSets active)
kubectl get replicasets -n pokemon-drafter

# Scale down old ones (replace hash with actual values)
kubectl scale replicaset <old-replicaset-name> --replicas=0 -n pokemon-drafter

# Or force a clean rollout
kubectl rollout restart deployment/<service-name> -n pokemon-drafter

8. CHECK PVC STATUS
kubectl get pvc -n pokemon-drafter

9. CHECK ALL RESOURCES
kubectl get all -n pokemon-drafter

10. TEAR DOWN EVERYTHING
kubectl delete namespace pokemon-drafter

# or just stop minikube
minikube stop