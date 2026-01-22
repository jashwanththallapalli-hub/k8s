# 🚢 Kubernetes Complete Guide

## Table of Contents
1. [Introduction to Kubernetes](#introduction-to-kubernetes)
2. [Core Terminology](#core-terminology)
3. [Kubernetes YAML Basics](#kubernetes-yaml-basics)
4. [Kubernetes Architecture](#kubernetes-architecture)
5. [Kubernetes Networking](#kubernetes-networking)
6. [Kubernetes Storage](#kubernetes-storage)
7. [Kubernetes Scaling](#kubernetes-scaling)
8. [Observability](#observability)
9. [Security](#security)
10. [Production Deployment](#production-deployment)

---

## Introduction to Kubernetes

Kubernetes (K8s) is an **orchestration platform** that helps you automate the deployment, scaling, and management of containerized applications.

### Why Kubernetes?

**Before Kubernetes:**
- ❌ Single-host deployments
- ❌ No auto-healing
- ❌ No auto-scaling
- ❌ Minimalistic setup with no enterprise support
- ❌ No built-in load balancing
- ❌ No firewall management
- ❌ No API gateway
- ❌ Complex networking and service discovery
- ❌ Difficult multi-server (node) management

**With Kubernetes:**
- ✅ Multi-node cluster management
- ✅ Automatic healing and recovery
- ✅ Horizontal and vertical scaling
- ✅ Enterprise-grade features
- ✅ Built-in load balancing
- ✅ Service discovery and DNS
- ✅ Rolling updates and rollbacks
- ✅ Declarative configuration

---

## Core Terminology

### 1. **Cluster**
A **cluster** is a group of machines (nodes) running Kubernetes.
- These machines work together to host your applications
- Contains **Control Plane** (master) and **Worker Nodes**
- Control Plane manages the cluster
- Worker Nodes run applications

### 2. **Node**
A **node** is a single machine in the cluster.
- Runs pods and is managed by the Control Plane
- Has `kubelet` to communicate with the Control Plane
- Can be physical or virtual machines

### 3. **Pod**
A **pod** is the smallest deployment unit in Kubernetes.
- Contains one or more containers
- Containers in a pod share the same memory and network
- Example: A pod running a single nginx container

**Key Points:**
- Containers inside pods share the same IP address
- Pods share storage volumes
- Pods share the same lifecycle
- If a container crashes, the pod controller restarts it

### 4. **Deployment**
A **Deployment** manages pods.
- Ensures a certain number of pods are running
- Handles updates and rollbacks
- Maintains desired state
- Handles scaling automatically

### 5. **Service**
A **Service** exposes pods to the network.
- Provides stable IP and DNS
- Enables communication between pods or external users
- Three main types:

#### **ClusterIP** (Default)
- Only accessible inside the cluster
- Pods inside the cluster communicate using ClusterIP
- Cannot be accessed from outside

#### **NodePort**
- Exposes the service on every worker node's IP
- Port range: 30000-32767
- Example: `http://192.168.1.10:31234`
- **Limitations:** Not secure, not user-friendly, not scalable

#### **LoadBalancer**
- Best way for external access
- Automatically forwards traffic to services
- Highly available and scalable
- Cloud-managed (AWS ELB, GCP Load Balancer, Azure Load Balancer)

### 6. **Namespace**
A **Namespace** is a virtual partition inside a Kubernetes cluster.
- Organizes and isolates resources
- Useful for multi-team clusters
- Separate environments: dev, staging, production

```bash
kubectl create namespace dev
kubectl create deployment nginx --image=nginx -n dev
```

### 7. **ConfigMap & Secret**

#### **ConfigMap**
- Stores non-sensitive configuration data
- Acts like a mailbox for configuration
- Separates code from configuration

#### **Secret**
- Stores sensitive data (passwords, tokens, API keys)
- Base64 encoded (not encrypted by default)
- Should be encrypted at rest in production

### 8. **Ingress**
**Ingress** is used when external users want to access applications inside Kubernetes.
- Receives, routes, and handles external traffic
- Provides load balancing, SSL termination, and URL routing

**Example Routing:**
```
myapp.com/       → nginx-service
myapp.com/api    → backend-service
blog.myapp.com   → blog-service
```

**One entry point → Many apps routed**

#### **Ingress vs Ingress Controller**
- **Ingress:** A configuration file (YAML manifest) that declares routing rules
- **Ingress Controller:** Software that watches Ingress resources and enforces routing rules (e.g., Nginx Ingress Controller, Traefik)

---

## Kubernetes YAML Basics

Every Kubernetes YAML file has **4 main sections:**

### 1. **apiVersion**
Tells Kubernetes which API version the resource uses.

```yaml
apiVersion: v1                      # Pod, Service, ConfigMap, Secret
apiVersion: apps/v1                 # Deployment, StatefulSet, DaemonSet
apiVersion: networking.k8s.io/v1    # Ingress, NetworkPolicy
```

### 2. **kind**
Specifies what resource you're creating.

```yaml
kind: Pod
kind: Deployment
kind: Service
kind: ConfigMap
kind: Ingress
```

### 3. **metadata**
Provides basic information about the resource.

```yaml
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
```

### 4. **spec**
The heart of the YAML file. Each resource has its own spec.

---

## YAML Examples

### **Pod YAML**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
    - name: my-container
      image: nginx:latest
```

### **Deployment YAML**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-container
          image: nginx:latest
          ports:
            - containerPort: 80
```

### **Service YAML**

#### ClusterIP Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

#### NodePort Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```

#### LoadBalancer Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

### **ConfigMap YAML**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  APP_ENV: "production"
  APP_VERSION: "1.0"
```

### **Secret YAML**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: bWFoZXNo        # base64 encoded
  password: QmZiQDM0bmo=    # base64 encoded
```

### **Ingress YAML**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
    - host: my.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

### **Job YAML**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    spec:
      containers:
        - name: task
          image: busybox
          command: ["echo", "Hello from Job!"]
      restartPolicy: Never
```

### **CronJob YAML**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: task
              image: busybox
              command: ["echo", "Hello from CronJob!"]
          restartPolicy: Never
```

---

## Pod Management Commands

### Create Pod
```bash
kubectl apply -f pod.yaml
```

### Check Pods
```bash
kubectl get pods
```

### Describe Pod
```bash
kubectl describe pod myfirst-pod
```

### Get Pod Logs
```bash
kubectl logs myfirst-pod
```

### Enter Container
```bash
kubectl exec -it myfirst-pod -- /bin/bash
```

### Delete Pod
```bash
kubectl delete pod myfirst-pod
```

---

## Pod Statuses

| Status              | Meaning                             |
|---------------------|-------------------------------------|
| Pending             | Image pulling / scheduling          |
| ContainerCreating   | Creating container                  |
| Running             | Pod running normally                |
| CrashLoopBackOff    | Container keeps crashing repeatedly |
| ImagePullBackOff    | Wrong image name / cannot pull      |
| Completed           | Finished (for jobs)                 |
| Error               | Container exited with error         |
| Terminating         | Pod is being deleted                |

---

## How Pods Get an IP Address

Every pod gets its own IP address inside the cluster.

```bash
curl http://10.244.1.10:80
```

The IP is assigned by the **CNI (Container Network Interface)** plugin.

---

## Kubernetes Architecture

Kubernetes has **2 planes:**

### 1. **Control Plane** (Master)
Decides what should run and where.

### 2. **Data Plane** (Worker Nodes)
Machines that actually run your containers.

---

## Control Plane Components

### 1. **kube-apiserver**
- All `kubectl` commands and requests go here
- Exposes the Kubernetes API
- Stores desired state in etcd
- Validates requests but doesn't make decisions

### 2. **etcd**
- Distributed key-value store
- Stores everything about the cluster
- Without etcd, Kubernetes won't remember anything
- **Needs regular backups**

### 3. **kube-scheduler**
- Acts as a job allocator
- Looks for new pods that need a place to run
- Chooses the best worker node based on:
  - CPU and memory availability
  - Taints and tolerations
  - Affinity rules
  - Node selectors

### 4. **kube-controller-manager**
- Acts as a rule enforcer
- Runs many controllers:
  - ReplicaSet Controller
  - Node Controller
  - Deployment Controller
  - Job Controller
- Example: You asked for 3 replicas, but only 2 are running → Controller creates 1 more

### 5. **cloud-controller-manager**
- Integrates Kubernetes with cloud providers (AWS/GCP/Azure)
- Creates load balancers
- Manages volumes
- Handles cloud-specific lifecycle operations

---

## Data Plane Components (Worker Nodes)

### 1. **kubelet**
- The supervisor on each node
- Talks to the API server
- Ensures containers are running
- Reports health back to the Control Plane

### 2. **Container Runtime**
- Runs container images
- Examples: Docker, containerd, CRI-O

### 3. **kube-proxy**
- Ensures traffic routes to the correct pod
- Implements services using iptables or IPVS
- Handles load balancing at the network level

### 4. **CNI (Container Network Interface) Plugin**
- Assigns pod IPs
- Routes traffic between pods
- Enforces network policies
- Examples: Calico, Flannel, Weave Net, Cilium

---

## Overall Workflow

```
1. Deploy pod → kubectl apply -f app.yaml
2. API server receives request and stores desired state in etcd
3. Controller Manager notices we need (e.g., 3 replicas)
4. Scheduler decides pods should run on which Node (e.g., Node 2)
5. kubelet on Node 2 starts containers using container runtime
6. kube-proxy + CNI set up networking and assign IPs
```

**Flow:**
```
YAML → API Server → etcd → Controllers → Scheduler → kubelet → CNI & kube-proxy
```

---

## Moving Applications to Production

A production-ready cluster must be:

- ✅ **Highly Available:** Multiple API servers, multiple etcd members, spread across multiple Availability Zones
- ✅ **Secure:** RBAC, secrets encryption, network policies, TLS everywhere
- ✅ **Observable:** Logs, metrics, alerts
- ✅ **Backed Up:** Regular etcd backups
- ✅ **Maintained:** Regular updates and patches
- ✅ **Autoscaled:** HPA, VPA, Cluster Autoscaler

---

## Cluster Deployment Using KOPS

**KOPS (Kubernetes Operations)** is a tool for creating Kubernetes clusters on AWS.

### Features:
- ✅ Automates Control Plane + infrastructure setup
- ✅ Stores cluster config in S3
- ✅ Creates VPC, subnets, routing
- ✅ Creates EC2 instances for masters and nodes
- ✅ Sets up etcd
- ✅ Sets up API server load balancer
- ✅ Generates cluster configs
- ✅ Supports rolling upgrades

---

## Kubernetes Networking

Kubernetes follows **4 fundamental rules:**

1. Every Pod gets its own IP
2. Pods can communicate without NAT
3. Nodes can communicate with Pods directly
4. Services provide stable access to Pods

---

## Key Networking Concepts

### 1. **CNI (Container Network Interface)**
A plugin that creates networks for pods.

**Responsibilities:**
- Assigns Pod IP
- Creates network interface for the pod
- Connects pod to the cluster network
- Sets up routing rules

**Popular CNI Plugins:**
- Calico
- Flannel
- Weave Net
- Cilium

### 2. **Pod CIDR**
The **Pod CIDR (Classless Inter-Domain Routing)** is the IP address range from which Kubernetes assigns unique IP addresses to pods.

**Example:**
```
Pod CIDR: 10.244.0.0/16
Pod 1: 10.244.1.5
Pod 2: 10.244.1.8
Pod 3: 10.244.2.9
```

### 3. **Service CIDR**
The **Service CIDR** is a range of IP addresses used for assigning virtual IPs (VIPs) to Services.

**Why Services?**
- Pods can die and change IPs
- Services keep the same IP & DNS
- Clients don't get confused or break

**Example:**
```
1. Create a Service: backend-service → 10.96.45.25
2. Frontend calls: http://backend-service
3. Backend Pod dies & IP changes
4. Service automatically updates its backend endpoints
✔ Service IP does NOT change
✔ DNS name does NOT change
✔ Clients don't care about Pod IPs
```

---

## DNS in Kubernetes (CoreDNS)

**CoreDNS** is responsible for service discovery and dynamic DNS updates within the cluster.

### How It Works:
- CoreDNS runs as a pod in the `kube-system` namespace
- Every pod is automatically configured to ask CoreDNS for name resolution
- CoreDNS answers two kinds of questions:
  - **Internal names:** Kubernetes services
  - **External names:** Internet domains

### DNS Names Format:
```
<service-name>.<namespace>.svc.cluster.local
```

**Example:**
```
backend.default.svc.cluster.local
```

### DNS Resolution Flow:

```
1. Frontend asks: curl http://backend:8080
2. Pod checks /etc/resolv.conf
3. Sees nameserver 10.96.0.10 (CoreDNS Service)
4. Request goes to CoreDNS
5. CoreDNS asks Kubernetes API: "Who is backend?"
6. Kubernetes replies: "Yes → ClusterIP = 10.96.45.20"
7. CoreDNS replies to frontend: backend = 10.96.45.20
8. kube-proxy intercepts and forwards to one of the backend pods
```

---

## How Pods Communicate

### **Case 1: Pod → Pod (Same Node)**
```
Pod A → 10.244.1.5
Pod B → 10.244.1.8

Flow:
1. Pod A sends packet to 10.244.1.8
2. Packet stays inside the node
3. CNI bridge delivers it to Pod B
```
**No kube-proxy involved here.**

### **Case 2: Pod → Pod (Different Nodes)**
```
Pod A → Node-1 → 10.244.1.5
Pod B → Node-2 → 10.244.2.9

Flow:
1. Pod A sends packet to 10.244.2.9
2. Node-1 routing table knows: 10.244.2.0/24 → Node-2
3. Packet travels over the cluster network
4. Node-2 delivers it to Pod B
```

---

## How Services Route Traffic

### Steps:
```
1. Frontend calls Backend: curl http://backend:8080
2. DNS Resolution: Pod asks CoreDNS about "backend"
   CoreDNS replies: backend → 10.96.45.20 (Service IP)
3. Traffic hits Service IP
4. kube-proxy has already installed iptables/IPVS rules
5. Rule: If destination = 10.96.45.20, forward to one of:
   - 10.244.2.9
   - 10.244.3.4
```

**kube-proxy load balances at the network level using iptables or IPVS.**

### Traffic Flow Diagram:
```
Pod
 ↓ (DNS)
Service IP
 ↓ (kube-proxy)
Pod
```

---

## Kubernetes Storage

### The Problem:
If a pod restarts:
- ❌ Container filesystem is wiped
- ❌ Data is lost

**Solution:** Persistent Storage

---

## Storage Concepts

### 1. **PersistentVolume (PV)**
- Real piece of storage in the cluster
- Created by an admin
- Cluster-level resource
- Exists independently of pods

### 2. **PersistentVolumeClaim (PVC)**
- Pods never use PV directly
- Pods use PVC
- PVC is a request for storage

### Flow:
```
Pod → PVC → PV → Actual Storage
```

When a pod starts:
- Kubernetes mounts the PV
- Data persists across pod restarts

---

## StorageClass

**Without StorageClass:**
- Admin manually creates PVs
- Slow and not scalable

**With StorageClass:**
- Automates storage provisioning
- Defines how storage should be created

### StorageClass Describes:
- Disk type (gp3, gp2, standard)
- Performance characteristics
- Provisioner (EBS, Azure Disk, GCE PD, etc.)

### Dynamic Provisioning:
Automates the process of PVC and PV creation.

**Flow:**
```
1. User creates PVC
2. StorageClass automatically creates PV
3. PV binds to PVC
4. Pod uses PVC
```

---

## Kubernetes Scaling

Traffic is not constant:
- Morning → Low traffic
- Afternoon → Medium traffic
- Sale/Incident → Huge spike

**Problems:**
- Too few pods → App crashes ❌
- Too many pods → Money wasted ❌

**Solution:** Autoscaling

---

## Scaling Happens at 4 Levels:

1. **Pod Count** (HPA)
2. **Pod Size** (VPA)
3. **Cluster Size** (Cluster Autoscaler)
4. **Event-Based** (KEDA)

---

## 1. Horizontal Pod Autoscaler (HPA)

**HPA** increases or decreases the number of pods based on metrics.

### How HPA Works:
```
1. Pods expose CPU/memory usage
2. Metrics Server collects metrics
3. HPA watches metrics
4. If threshold crossed → scale pods
   Example: CPU > 70% → scale from 2 → 5 pods
```

### HPA YAML Example:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 2. Vertical Pod Autoscaler (VPA)

**VPA** adjusts CPU & memory requests/limits of pods.

**Use Case:**
- Pod count is fine
- But pod size is wrong

**VPA optimizes resource size, not replicas.**

---

## 3. Cluster Autoscaler (CA)

**Cluster Autoscaler** adds or removes worker nodes.

### Flow:
```
1. HPA wants more pods
2. No nodes available
3. Pods stuck in Pending ❌
4. CA notices
5. New node is added (cloud provider)
6. Pod gets scheduled ✅
```

---

## 4. KEDA (Event-Driven Autoscaling)

**KEDA** scales pods based on events, not just resource usage.

### Examples:
- Kafka messages pending
- RabbitMQ queue depth
- AWS SQS messages
- Cron schedules
- HTTP requests

---

## Observability

In production, you always ask **3 questions:**

1. Is my system healthy?
2. What is happening right now?
3. Why did something break?

### Three Pillars of Observability:

- **Logs** → What happened?
- **Metrics** → How much / how often?
- **Traces** → Where is time spent?

---

## Prometheus + Grafana

### **Prometheus:**
- Pulls metrics (scrapes)
- Stores time-series data
- Uses PromQL for queries
- Generates alerts

### **Grafana:**
- Queries Prometheus
- Displays dashboards
- Creates visualizations
- Sends alerts

### Architecture:
```
Application
 ↓
Prometheus (scrapes metrics)
 ↓
Grafana (visualizes)
```

---

## Kube-State-Metrics

**kube-state-metrics** exposes Kubernetes resource state (not resource usage).

### Examples:
- Desired replicas vs available replicas
- Pod status (Running/Pending)
- Node conditions
- Deployment status

---

## OpenTelemetry

**Earlier:**
- One tool for logs
- One tool for metrics
- One tool for tracing

**OpenTelemetry:**
- One standard to collect logs, metrics, and traces
- A collection + instrumentation framework

### Architecture:
```
Application
 ├── Logs ─────────► Loki / ELK
 ├── Metrics ──────► Prometheus
 └── Traces ───────► Jaeger / Tempo
           ▲
     OpenTelemetry
```

---

## Metrics Server vs Prometheus

| Aspect                | Metrics Server        | Prometheus                      |
|-----------------------|-----------------------|---------------------------------|
| Purpose               | Autoscaling & kubectl | Monitoring & alerting           |
| Metrics type          | CPU & Memory only     | Any metric (custom, app, infra) |
| Storage               | No (short-lived)      | Yes (time-series DB)            |
| Retention             | Seconds               | Days / weeks                    |
| Used by               | HPA, kubectl top      | Grafana, alerts                 |
| Querying              | Not supported         | PromQL                          |
| Production monitoring | ❌ No                 | ✅ Yes                          |

---

## How Prometheus Scrapes Kubernetes

### Flow:
```
1. Kubernetes components & apps expose /metrics endpoint
   - kubelet
   - kube-apiserver
   - coredns
   - apps (via exporters)

2. Prometheus runs inside the cluster (Deployment/StatefulSet)

3. Prometheus uses Kubernetes Service Discovery
   - Watches: Pods, Services, Endpoints, Nodes

4. Based on labels/annotations, Prometheus:
   - Discovers targets dynamically
   - Scrapes metrics over HTTP

Example: http://<pod-ip>:<port>/metrics

5. Metrics are stored as time-series data
```

**Note:** Prometheus always **pulls** metrics. No pushing.

---

## Security

Kubernetes security answers **4 questions:**

1. **Who are you?** → Service Accounts
2. **What are you allowed to do?** → RBAC
3. **Who can talk to whom?** → Network Policies
4. **How do we store secrets safely?** → Secrets Management

---

## 1. Service Accounts (Identity for Pods)

**ServiceAccounts** provide pod-level identity to access the Kubernetes API.

### Key Points:
- Namespaced
- Automatically created (`default`)
- Mounted into pods as a token

**Inside a pod:**
```
/var/run/secrets/kubernetes.io/serviceaccount/token
```

This token is used to authenticate to `kube-apiserver`.

---

## 2. RBAC (Role-Based Access Control)

Once identity is known, Kubernetes asks: **"What are you allowed to do?"**

### 4 RBAC Objects:

#### **Role** (Namespace-scoped)
Defines allowed actions within a namespace.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
```

#### **ClusterRole** (Cluster-scoped)
Defines cluster-wide permissions.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
```

#### **RoleBinding**
Binds Role → User/ServiceAccount (namespace-scoped).

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
  - kind: ServiceAccount
    name: my-sa
    namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

#### **ClusterRoleBinding**
Binds ClusterRole → User/ServiceAccount (cluster-scoped).

---

## 3. Network Policies

**By default:** All pods can talk to all pods. This is dangerous.

**NetworkPolicy** controls network traffic between pods.

### Defines:
- Which pods can talk
- On which ports
- In which direction

### Types:

#### **Ingress**
- Incoming traffic from external sources into the cluster
- Managed using an Ingress resource
- Defines rules for routing HTTP/HTTPS traffic
- Provides load balancing, SSL termination, name-based virtual hosting
- Requires an Ingress Controller (Nginx, Traefik, Istio)

#### **Egress**
- Outgoing traffic from pods to external destinations
- By default, Kubernetes allows unrestricted egress
- Can be restricted using Network Policies

### Example NetworkPolicy:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

---

## 4. Secrets Management

Kubernetes Secrets store sensitive data in **base64 format**.

### Usage:
- Environment variables
- Mounted files

### Example:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: bWFoZXNo        # base64 encoded
  password: QmZiQDM0bmo=    # base64 encoded
```

### Best Practices:
- ✅ Use external secret managers in production:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault
  - Google Secret Manager
- ✅ Enable encryption at rest
- ✅ Use RBAC to restrict access
- ✅ Rotate secrets regularly
- ✅ Never commit secrets to Git

---

## Additional Important Concepts

### 1. **StatefulSets**
For stateful applications that require:
- Stable network identities
- Persistent storage
- Ordered deployment and scaling

**Use Cases:** Databases, message queues, distributed systems

### 2. **DaemonSets**
Ensures a copy of a pod runs on all (or some) nodes.

**Use Cases:** Log collectors, monitoring agents, network plugins

### 3. **Init Containers**
Run before app containers start.

**Use Cases:** Database migrations, configuration setup, waiting for dependencies

### 4. **Liveness & Readiness Probes**

#### **Liveness Probe**
Checks if container is alive. If it fails, kubelet restarts the container.

#### **Readiness Probe**
Checks if container is ready to serve traffic. If it fails, pod is removed from service endpoints.

### 5. **Resource Requests & Limits**
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

### 6. **Taints & Tolerations**
Control which pods can be scheduled on which nodes.

### 7. **Node Affinity**
Constrains which nodes pods can be scheduled on based on labels.

### 8. **Pod Disruption Budgets (PDB)**
Ensures minimum number of pods remain available during voluntary disruptions.

---

## Best Practices

### Development:
- ✅ Use namespaces to organize resources
- ✅ Label everything consistently
- ✅ Use ConfigMaps for configuration
- ✅ Use Secrets for sensitive data
- ✅ Define resource requests and limits
- ✅ Use health checks (liveness/readiness probes)

### Production:
- ✅ Enable RBAC
- ✅ Use Network Policies
- ✅ Encrypt secrets at rest
- ✅ Enable audit logging
- ✅ Use Pod Security Standards
- ✅ Implement monitoring and alerting
- ✅ Regular backups (especially etcd)
- ✅ Use Ingress with TLS
- ✅ Implement autoscaling (HPA, VPA, CA)
- ✅ Use external secret management
- ✅ Multi-zone/region deployment
- ✅ Regular security updates

---

## Common kubectl Commands

### Cluster Info:
```bash
kubectl cluster-info
kubectl get nodes
kubectl get namespaces
```

### Working with Pods:
```bash
kubectl get pods
kubectl get pods -n <namespace>
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # Follow logs
kubectl exec -it <pod-name> -- /bin/bash
```

### Working with Deployments:
```bash
kubectl get deployments
kubectl describe deployment <name>
kubectl scale deployment <name> --replicas=5
kubectl rollout status deployment <name>
kubectl rollout history deployment <name>
kubectl rollout undo deployment <name>
```

### Working with Services:
```bash
kubectl get services
kubectl describe service <name>
kubectl expose deployment <name> --port=80 --type=LoadBalancer
```

### Apply/Delete Resources:
```bash
kubectl apply -f <file.yaml>
kubectl delete -f <file.yaml>
kubectl delete pod <pod-name>
kubectl delete deployment <name>
```

### Debugging:
```bash
kubectl get events
kubectl top nodes
kubectl top pods
kubectl describe <resource> <name>
```

---

## Conclusion

Kubernetes is a powerful platform for managing containerized applications at scale. This guide covers the fundamental concepts, architecture, networking, storage, scaling, observability, and security.

**Key Takeaways:**
- Kubernetes automates deployment, scaling, and management
- Understand pods, deployments, services, and ingress
- Master YAML configuration
- Implement proper security (RBAC, Network Policies, Secrets)
- Use autoscaling for efficiency
- Monitor with Prometheus and Grafana
- Follow best practices for production deployments

**Next Steps:**
- Practice with a local cluster (Minikube, Kind, k3s)
- Deploy sample applications
- Implement CI/CD pipelines
- Explore service meshes (Istio, Linkerd)
- Learn Helm for package management
- Study GitOps (ArgoCD, Flux)

---

**Happy Learning! 🚀**
