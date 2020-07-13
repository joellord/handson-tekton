
echo "Starting Minikube"
minikube start --vm-driver=none 

echo "Installing Tekton on minikube"
kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

echo "Course environment is ready."