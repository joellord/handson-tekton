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
Tasks happen inside a pod. You can use tasks to perform various CI/CD operations. Things like compiling your application or running some unit tests.

For this first task, you will simply use a Red Hat Universal Base Image and echo a hello world.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello
spec:
  steps:
    - name: say-hello
      image: registry.access.redhat.com/ubi8/ubi
      command:
        - /bin/bash
      args: ['-c', 'echo Hello World']
```

Apply this task to your cluster just like any other Kubernetes object. Then run it using `tkn`, the CLI tool for Tekton.

```bash
kubectl apply -f ./demo/01-hello.yaml
tkn task start --showlog hello
```

## Add a Parameter to the task

Tasks can also take parameters. This way, you can pass various flags to be used in this task. This could be useful for a task that would run unit tests but where you could specify a subset of tests to run as a parameter.

In this next example, you will create a task that will ask for a person name and then say Hello to that person.

Starting with the previous example, you can add a `params` property to the `spec` of your task. A param takes a name and a type. You can also add a description and a default value for this task. 

For this parameter, the name is `person`, the description with be `Name of person to greet`, the default value will be `World` so we can say "Hello World" if no value is provided and the type of parameter is a `string`.

You can then access those params by using variable substitution. In this case, change the word "World" in the `args` line to `$(params.person)`.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello
spec:
  params:
    - name: person
      description: Name of person to greet
      default: World
      type: string
  steps:
    - name: say-hello
      image: registry.access.redhat.com/ubi8/ubi
      command:
        - /bin/bash
      args: ['-c', 'echo Hello $(params.person)']
```

Apply this new task to your cluster with kubectl and then run it again. You will now be asked for the name of the person to greet.

You can also specify the parameters directly from the command line by using the -p argument.

```bash
kubectl apply -f ./demo/02-param.yaml
tkn task start --showlog hello
tkn task start --showlog -p person=Joel hello
```

## Multiple steps to Task

Your tasks can have more than one step. In this next example you will change this task to use two steps. The first one will write to a file and the second one will output the content of that file. The steps will run in the order in which they are defined in the `steps` array.

First, start by adding a new step called `write-hello`. In here, you will use the same UBI base image. Instead of using a single command, you can also write a script. You can do this with a `script` parameter, followed by a | and the actual script to run. In this script, start by echoing "Preparing greeting", then echo the "Hello $(params.person)" that you had in the previous example into the ~/hello.txt file. Finally, add a little pause with the sleep command and echo "Done".

For the second step, you can create a new step called `read-hello`. This second step will run in its own container but will share the /tekton folder from the previous step. In the first step, you created a file in the "~" folder which maps to "/tekton/home". For this second step, you can use an image `node:14` and the file you created in the first step will be accessible. You can also run a NodeJS script as long as you specify the executable in the #! line of your script. In this case, you can write a script that will output the content of the ~/hello.txt file.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: hello
spec:
  params:
    - name: person
      description: Name of person to greet
      default: World
      type: string
  steps:
    - name: write-hello
      image: registry.access.redhat.com/ubi8/ubi
      script: |
        #!/usr/bin/env bash
        echo Preparing greeting
        echo Hello $(params.person) > ~/hello.txt
        sleep 2
        echo Done!
    - name: say-hello
      image: node:14
      script: |
        #!/usr/bin/env node
        let fs = require("fs");
        let file = "/tekton/home/hello.txt";
        let fileContent = fs.readFileSync(file).toString();
        console.log(fileContent);
```

You can now apply this task to your cluster and run this task with tkn. You will see that you can easily see the output of each step as they are highlighted in the output from Tekton.

```bash
kubectl apply -f ./demo/03-multistep.yaml
tkn task start --showlog hello
```

## Pipelines

Tasks are nice but you will usually want to run more than one task. In fact, tasks should do one single thing so you can reuse them across pipelines or even within a single pipeline. For this next examples, you will rewrite the task you had in the last section as two different tasks. You can also create another new task that will output some progress. It will take a percentage as an argument.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: write-hello
spec:
  params:
    - name: person
      description: Name of person to greet
      default: World
      type: string
  steps:
    - name: write-hello
      image: registry.access.redhat.com/ubi8/ubi
      script: |
        #!/usr/bin/env bash
        echo Preparing greeting
        echo Hello $(params.person) > ~/hello.txt
---
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: say-hello
spec:
  params:
    - name: person
      description: Name of person to greet
      default: World
      type: string
  steps:
    - name: say-hello
      image: node:14
      script: |
        #!/usr/bin/env node
        let fs = require("fs");
        let file = "/tekton/home/hello.txt";
        let fileContent = fs.readFileSync(file).toString();
        console.log(fileContent);
--- 
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: 
spec:
  params:
  - name: percentage
    defaultValue: 0
    type: number
    description: Current progress in percentage
  steps:
    - name: show-progress
      image: registry.access.redhat.com/ubi8/ubi
      command:
        - /bin/bash
      args: ['-c', 'echo Progress: $(params.percentage)%']
```

You are now ready to build your first pipeline.

See 05-pipeline.yaml

Doesn't work...  need workspaces

# Workspaces
See 06-workspaces.yaml

Doesn't work, need reordering

# Run in parallel or in sequence
See 07-notdoneyet.yaml

# Resources
You can also add resources to reuse your pipelines. 
Count files task
Add git repo input resource

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