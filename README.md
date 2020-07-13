# Hands-On Tekton

## Requirements
* Minikube
* Tkn
* VS Code extension
 (Course Tools container?)

## Intro
* Intros, why should you care about CI/CD
* What is CI/CD and Cloud Native CI/CD
* Tekton


## Installation
Start by installing Tekton on your cluster.

```bash
kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
```

## Create a Hello World task

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello-task
spec:
  steps:
    - name: say-hello
      image: ubuntu
      command:
        - /bin/bash
      args: ['-c', 'echo hello world']
```

Run the task using tkn
```bash
tkn task start hello-task
```

## Add a Parameter to the task

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello-someone
spec:
  params:
  - name: person
    description: Name of person to greet
    default: World
    type: string
  resources:
    inputs:
  steps:
    - name: greet-person
      image: ubuntu
      command:
        - /bin/bash
      args: ['-c', 'echo hello $(params.person)']
```

Run task using (default value vs parameter)
```
tkn task start hello-someone
tkn task start -p person=Joel hello-someone
```

## Multiple steps to Task

Shared container within a task. Write and read from file system

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: multistep
spec:
  params:
  - name: person
    description: Name of person to greet
    default: World
    type: string
  steps:
    - name: write-hello
      image: ubuntu
      command:
        - /bin/bash
      args: ['-c', 'echo hello $(params.person) > ~/hello.txt && echo done']
    - name: say-hello
      image: ubuntu
      command:
        - /bin/bash
      args: ['-c', 'cat ~/hello.txt']
```

## Pipeline 

Create a pipeline with hello task

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: hello-pipeline
spec:
  tasks:
    - name: hello-task
      taskRef:
        name: hello-task
```

Diffent containers for each step, recreate multi step task in two tasks
Shared volume

Introduction to resources
Create pipeline with git repo input

## Real world pipeline
Pipeline tasks
* git clone (input resource)
* npm install
  * npm run lint
  * npm run test
* create image

Next steps
Move both npm run tasks in parallel
Show failure in one step
Fix it and start new pipelinerun

## Bonus Stretch
Connect a Hue lightbulb and change color on success/failure