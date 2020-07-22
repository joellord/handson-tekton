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

Tasks are nice but you will usually want to run more than one task. In fact, tasks should do one single thing so you can reuse them across pipelines or even within a single pipeline. For this next examples, you will start by writing a generic tasks that will echo whatever is passed in the parameter.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: say-something
spec:
  params:
    - name: say-what
      description: What should I say
      default: hello
      type: string
    - name: pause-duration
      description: How long to wait before saying something
      default: 0
      type: string
  steps:
    - name: say-it
      image: registry.access.redhat.com/ubi8/ubi
      command:
        - /bin/bash
      args: ['-c', 'sleep $(params.pause-duration) && echo $(params.say-what)']
```

You are now ready to build your first pipeline. A pipeline is a series of tasks that can run either in parallel or at the same time. In this pipeline, you will use the `say-something` tasks twice with different outputs.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: say-things
spec:
  tasks:
    - name: first-task
      params:
        - name: pause-duration
          value: "2"
        - name: say-what
          value: "Hello, this is the first task"
      taskRef:
        name: say-something
    - name: second-task
      params:
        - name: say-what
          value: "And this is the second task"
      taskRef:
        name: say-something
```

You can now apply the task and this new pipeline to your cluster and start the pipeline. Using `tkn pipeline start` will create a `PipelineRun` with a random name. You can also see the logs of the pipeline by using the `--showlog` parameter.

```bash
kubectl apply -f ./demo/04-tasks.yaml
kubectl apply -f ./demo/05-pipeline.yaml
tkn pipeline start say-thing --showlog
```

# Run in parallel or in sequence

You might have noticed that in the last example, the outputs of the tasks came out in the wrong order. That is because Tekton will try to start all the tasks at the same time so they can run in parallel. If you needed a task to complete before another one, you can use the `runAfter` parameter in the task definition of your pipeline.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: say-things-in-order
spec:
  tasks:
    - name: first-task
      params:
        - name: pause-duration
          value: "2"
        - name: say-what
          value: "Hello, this is the first task"
      taskRef:
        name: say-something
    - name: second-task
      params:
        - name: say-what
          value: "Happening after task 1, in parallel with task 3"
        - name: pause-duration
          value: "2"
      taskRef:
        name: say-something
      runAfter: 
        - first-task
    - name: third-task
      params:
        - name: say-what
          value: "Happening after task 1, in parallel with task 2"
        - name: pause-duration
          value: "1"
      taskRef:
        name: say-something
      runAfter: 
        - first-task
    - name: fourth-task
      params:
        - name: say-what
          value: "Happening after task 2 and 3"
      taskRef:
        name: say-something
      runAfter:
        - second-task
        - third-task
```

If you apply this new pipeline and run it with the Tekton CLI tool, you should see the logs from each task and you should see them in order. If you've installed the Tekton VS Code extension by Red Hat, you will also be able to see a preview of your pipeline and see the order in which each of the steps are happing.

# Resources

The last object that will be demonstrated in this lab is `PipelineResources`. When you create pipelines, you will want to make them as generic as you can. This way, your pipelines can be re-used across various projects. In the previous examples, we used pipelines that didn't really do anything interesting. Typically, you will want to have some sort of input on which you will want to perform your tasks. Typically, this would be a git repository. At the end of your pipeline, you will also typically want some sort of output. Something like an image. This is where PipelineResources will come into play. 

In this next example, you will create a pipeline that will take any git repository as a PipelineResource and then count the number of files in it.

First, you can start by creating a task. This task will be similar to the ones you've created earlier but will also have an input resource.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: count-files
spec:
  resources:
    inputs:
      - name: repo
        type: git
        targetPath: code
  steps:
    - name: count
      image: registry.access.redhat.com/ubi8/ubi
      command:
        - /bin/bash
      args: ['-c', 'echo $(find ./code -type f | wc -l) files in repo']
```

Next, you can create a pipeline that will also have an input resource. This pipeline will have a single task which will be the `count-files` task you've just defined.

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: count
spec:
  resources:
    - name: git-repo
      type: git
  tasks:
    - name: count-task
      taskRef:
        name: count-files
      resources:
        inputs:
          - name: repo
            resource: git-repo
```

Finally, you can create a PipelineResource. This resource is of type `git` and you can put in the link of a Github repository in the `url` parameter. You can use the repo to this project.

```yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: git-repo
spec:
  type: git  
  params:
    - name: url
      value: https://github.com/joellord/handson-tekton.git
```

Once you have all the required pieces, you can apply this file to the cluster again, and start this pipelinerun. When you start the pipeline with the CLI, you will be prompted on the git resource to use. You can either use the resource you've just created or create your own. You could also use the `--resource` parameter with the CLI to specify which resources to use.

```bash
kubectl apply -f ./demo/07-pipelineresource.yaml
tkn pipeline start count --showlog
tkn pipeline start count --showlog --resource git-repo=git-repo
```

# Workspaces
It is important to note that PipelineResources are still in alpha and the Tekton core team questions whether they should stay in the spec or not. In the latest version of Tekton, `workspaces` were added as a way to share file systems between various tasks in a Pipeline. You can find an example of a pipeline using a workspace in the file workspace.yaml. Workspaces require the usage of PersistentVolumes and PersistentVolumeClaims which are out of scope for this lab.

## Real world pipeline
So far, all these examples have been good to demonstrate how Tekton internals work but not very useful for your day to day developer life. Let's look at a real Pipeline. In this section, you will create a Pipeline that will run three tasks for a NodeJS project

* It will run a linter to ensure there are not linting issues in the code
* It will run the unit tests to validate the code
* If both the linting and testing pass, it will create a NodeJS image and push it to Docker using `s2i` and `buildah`

First, you will start with the `npm` task. This task will be generic enough so that it can be used for the first two steps of the Pipeline.

This task has two parameters, one for the command line arguments to be used with npm (action) and the other one to specify what is the path of the application inside the git repository.

```yaml 
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: npm
spec:
  params:
    - name: pathContext
      description: Path to application inside git
      default: "."
      type: string
    - name: action
      description: Operation to be performed by npm
      default: "start"
      type: string
  resources:
    inputs:
      - name: repo
        type: git
  steps:
    - name: npm-install
      image: node:14
      command:
        - /bin/bash
      args: ['-c', 'cd repo/$(params.pathContext) && npm install']
    - name: npm-lint
      image: node:14
      command:
        - /bin/bash
      args: ['-c', 'cd repo/$(params.pathContext) && npm $(params.action)']
```