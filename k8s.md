# Kubernetes Complete Deep Dive Guide

**A Comprehensive Resource for Learning, Interview Preparation, and Production Usage**

---

## Table of Contents

1. [Pods](#1-pods)
2. [Services (ClusterIP, NodePort, LoadBalancer)](#2-services-clusterip-nodeport-loadbalancer)
3. [kube-proxy & Service Traffic Flow](#3-kube-proxy--service-traffic-flow)
4. [Deployments](#4-deployments)
5. [ReplicaSets](#5-replicasets)
6. [Pod Lifecycle & Scheduling](#6-pod-lifecycle--scheduling)
7. [Labels & Selectors](#7-labels--selectors)
8. [ConfigMaps](#8-configmaps)
9. [Secrets](#9-secrets)
10. [Deployment + Service (End-to-End Flow)](#10-deployment--service-end-to-end-flow)
11. [Scaling Deployments](#11-scaling-deployments)
12. [Rolling Updates & Rollbacks](#12-rolling-updates--rollbacks)
13. [Liveness & Readiness Probes](#13-liveness--readiness-probes)
14. [Namespaces](#14-namespaces)
15. [Resource Requests & Limits](#15-resource-requests--limits)
16. [Volumes](#16-volumes)
17. [Persistent Volumes (PV)](#17-persistent-volumes-pv)
18. [Persistent Volume Claims (PVC)](#18-persistent-volume-claims-pvc)
19. [Ingress & Ingress Controller](#19-ingress--ingress-controller)
20. [Horizontal Pod Autoscaler (HPA)](#20-horizontal-pod-autoscaler-hpa)
21. [Kubernetes Cluster Architecture](#21-kubernetes-cluster-architecture)
22. [Kubernetes Troubleshooting Guide](#22-kubernetes-troubleshooting-guide)

---

## 1. Pods

![Pod Architecture](https://cdn.glitch.global/4bf0a0a2-8f1e-4b0e-b4c6-5e5e5e5e5e5e/pod-architecture.png)

### Concept Explanation (IN DETAIL)

**What is a Pod?**

A Pod is the smallest and most basic deployable unit in Kubernetes. It represents a single instance of a running process in your cluster. A Pod encapsulates one or more containers (usually Docker containers), storage resources, a unique network IP, and options that govern how the container(s) should run.

**Why does it exist?**

Pods exist to provide a higher-level abstraction over containers. While containers are great for packaging applications, they need additional infrastructure support for networking, storage, and lifecycle management. Pods provide this infrastructure layer, allowing containers to work together as a cohesive unit.

**What problem does it solve?**

Pods solve several critical problems:

1. **Co-location**: Some applications need multiple containers that must run on the same machine and share resources (like a web server and a log collector).
2. **Shared networking**: Containers in a Pod share the same network namespace, meaning they can communicate via localhost.
3. **Shared storage**: Containers in a Pod can share volumes, enabling data sharing.
4. **Atomic scheduling**: All containers in a Pod are scheduled together on the same node, ensuring they're always co-located.
5. **Lifecycle management**: Kubernetes manages the entire lifecycle of Pods, including creation, scaling, and termination.

**How it works internally?**

When you create a Pod, Kubernetes performs the following steps:

1. The API Server receives the Pod specification and stores it in etcd.
2. The Scheduler watches for unscheduled Pods and selects an appropriate node based on resource requirements, constraints, and policies.
3. The kubelet on the selected node receives the Pod specification.
4. The kubelet instructs the container runtime (like Docker or containerd) to pull the required images.
5. The container runtime creates a "pause" container first, which holds the network namespace.
6. Application containers are then created and attached to the pause container's network namespace.
7. The kubelet monitors the Pod's health and reports status back to the API Server.

### Architecture / Internal Working

**Step-by-step flow:**

1. **Pod Creation Request**: User submits a Pod manifest to the API Server via kubectl or API call.

2. **API Server Processing**: 
   - Validates the Pod specification
   - Authenticates and authorizes the request
   - Stores the Pod definition in etcd with status "Pending"

3. **Scheduler Assignment**:
   - Scheduler watches for Pods with no assigned node
   - Evaluates all nodes based on:
     - Resource availability (CPU, memory)
     - Node selectors and affinity rules
     - Taints and tolerations
     - Pod topology spread constraints
   - Selects the best node and updates the Pod specification with nodeName

4. **Kubelet Execution**:
   - Kubelet on the assigned node watches for Pods scheduled to its node
   - Pulls container images if not already present
   - Creates the Pod sandbox (pause container) to establish the network namespace
   - Starts all init containers sequentially (if defined)
   - Starts all application containers in parallel

5. **Network Setup**:
   - CNI (Container Network Interface) plugin assigns an IP address to the Pod
   - Network policies are applied
   - Service endpoints are updated if the Pod matches any service selectors

6. **Storage Setup**:
   - Volumes are mounted according to the Pod specification
   - Persistent volumes are attached if PVCs are referenced

7. **Health Monitoring**:
   - Kubelet runs liveness and readiness probes
   - Reports Pod status to API Server
   - Restarts containers if liveness probes fail

**Components Involved:**

- **API Server**: Central management point, validates and stores Pod specs
- **etcd**: Stores the desired and current state of all Pods
- **Scheduler**: Assigns Pods to nodes
- **Kubelet**: Manages Pod lifecycle on each node
- **Container Runtime**: Actually runs the containers (Docker, containerd, CRI-O)
- **Kube-proxy**: Manages network rules for Pod communication
- **CNI Plugin**: Handles Pod networking

### YAML Definition (MANDATORY)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  namespace: default
  labels:
    app: nginx
    environment: production
    tier: frontend
  annotations:
    description: "Production nginx web server"
    owner: "platform-team"
spec:
  # Container specifications
  containers:
  - name: nginx
    image: nginx:1.21.6
    ports:
    - containerPort: 80
      name: http
      protocol: TCP
    - containerPort: 443
      name: https
      protocol: TCP
    
    # Resource management
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
    
    # Environment variables
    env:
    - name: ENVIRONMENT
      value: "production"
    - name: LOG_LEVEL
      value: "info"
    
    # Volume mounts
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
    - name: html-content
      mountPath: /usr/share/nginx/html
    
    # Health checks
    livenessProbe:
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    
    readinessProbe:
      httpGet:
        path: /ready
        port: 80
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
  
  # Init containers (run before main containers)
  initContainers:
  - name: init-setup
    image: busybox:1.35
    command: ['sh', '-c', 'echo "Initializing..." && sleep 5']
  
  # Volumes
  volumes:
  - name: nginx-config
    configMap:
      name: nginx-config
  - name: html-content
    emptyDir: {}
  
  # Scheduling constraints
  nodeSelector:
    disktype: ssd
  
  # Restart policy
  restartPolicy: Always
  
  # DNS policy
  dnsPolicy: ClusterFirst
  
  # Service account
  serviceAccountName: default
  
  # Security context
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
```

**Field Explanations:**

- **apiVersion**: API version for the resource (v1 for Pods)
- **kind**: Type of Kubernetes object (Pod)
- **metadata.name**: Unique name for the Pod within the namespace
- **metadata.labels**: Key-value pairs for organizing and selecting Pods
- **spec.containers**: List of containers to run in the Pod
- **containers.image**: Container image to use
- **containers.ports**: Ports to expose from the container
- **resources.requests**: Minimum resources guaranteed to the container
- **resources.limits**: Maximum resources the container can use
- **volumeMounts**: Where to mount volumes inside the container
- **livenessProbe**: Checks if container is alive; restarts if it fails
- **readinessProbe**: Checks if container is ready to serve traffic
- **initContainers**: Containers that run before main containers start
- **volumes**: Storage volumes available to containers
- **nodeSelector**: Constrains Pod to nodes with specific labels
- **restartPolicy**: When to restart containers (Always, OnFailure, Never)

### kubectl Commands

**Creation:**

```bash
# Create Pod from YAML file
kubectl apply -f pod.yaml

# Create Pod imperatively
kubectl run nginx-pod --image=nginx:1.21.6 --port=80

# Create Pod with environment variables
kubectl run nginx-pod --image=nginx --env="ENV=prod" --env="LOG_LEVEL=info"

# Create Pod with resource limits
kubectl run nginx-pod --image=nginx --requests='cpu=100m,memory=128Mi' --limits='cpu=200m,memory=256Mi'

# Create Pod in specific namespace
kubectl run nginx-pod --image=nginx -n production

# Dry run (see YAML without creating)
kubectl run nginx-pod --image=nginx --dry-run=client -o yaml
```

**Verification:**

```bash
# List all Pods
kubectl get pods

# List Pods with more details
kubectl get pods -o wide

# List Pods with labels
kubectl get pods --show-labels

# List Pods in all namespaces
kubectl get pods --all-namespaces

# Get detailed Pod information
kubectl describe pod nginx-pod

# Get Pod YAML
kubectl get pod nginx-pod -o yaml

# Get Pod JSON
kubectl get pod nginx-pod -o json

# Watch Pod status in real-time
kubectl get pods -w

# Check Pod logs
kubectl logs nginx-pod

# Check logs of specific container in multi-container Pod
kubectl logs nginx-pod -c nginx

# Follow logs in real-time
kubectl logs -f nginx-pod

# Get previous container logs (if container restarted)
kubectl logs nginx-pod --previous

# Check Pod events
kubectl get events --field-selector involvedObject.name=nginx-pod
```

**Debugging:**

```bash
# Execute command in Pod
kubectl exec nginx-pod -- ls /usr/share/nginx/html

# Interactive shell in Pod
kubectl exec -it nginx-pod -- /bin/bash

# Execute in specific container (multi-container Pod)
kubectl exec -it nginx-pod -c nginx -- /bin/bash

# Port forward to access Pod locally
kubectl port-forward nginx-pod 8080:80

# Copy files to/from Pod
kubectl cp nginx-pod:/etc/nginx/nginx.conf ./nginx.conf
kubectl cp ./index.html nginx-pod:/usr/share/nginx/html/

# Check Pod resource usage
kubectl top pod nginx-pod

# Get Pod IP and node information
kubectl get pod nginx-pod -o jsonpath='{.status.podIP}'
kubectl get pod nginx-pod -o jsonpath='{.spec.nodeName}'
```

**Cleanup:**

```bash
# Delete Pod
kubectl delete pod nginx-pod

# Delete Pod from YAML file
kubectl delete -f pod.yaml

# Force delete (immediate termination)
kubectl delete pod nginx-pod --force --grace-period=0

# Delete all Pods with specific label
kubectl delete pods -l app=nginx

# Delete all Pods in namespace
kubectl delete pods --all -n production
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Image Pull Errors**
   - Using incorrect image names or tags
   - Private images without imagePullSecrets
   - Network issues preventing image download

2. **Resource Constraints**
   - Setting limits lower than requests
   - Not setting resource requests, causing scheduling issues
   - Underestimating memory requirements leading to OOMKilled

3. **Port Conflicts**
   - Multiple containers trying to bind to the same port
   - containerPort not matching the application's listening port

4. **Volume Mount Issues**
   - Incorrect mount paths
   - Missing volume definitions
   - Permission issues with mounted volumes

5. **Health Check Failures**
   - Probes starting too early (low initialDelaySeconds)
   - Probe timeouts too short
   - Wrong probe endpoints or ports

**Troubleshooting Guide:**

**Issue: Pod stuck in Pending state**

```bash
# Check Pod events
kubectl describe pod nginx-pod

# Common causes and solutions:
# 1. Insufficient resources
#    - Check node resources: kubectl describe nodes
#    - Solution: Add more nodes or reduce resource requests

# 2. Node selector mismatch
#    - Check if nodes have required labels
#    - Solution: Remove nodeSelector or label nodes appropriately

# 3. Unbound PersistentVolumeClaim
#    - Check PVC status: kubectl get pvc
#    - Solution: Create appropriate PV or use dynamic provisioning
```

**Issue: Pod in CrashLoopBackOff**

```bash
# Check container logs
kubectl logs nginx-pod
kubectl logs nginx-pod --previous  # Logs from previous crash

# Common causes:
# 1. Application error at startup
#    - Solution: Fix application code or configuration

# 2. Missing dependencies
#    - Solution: Ensure all required files/configs are present

# 3. Liveness probe failing immediately
#    - Solution: Increase initialDelaySeconds
```

**Issue: ImagePullBackOff**

```bash
# Check events
kubectl describe pod nginx-pod

# Common causes:
# 1. Image doesn't exist
#    - Solution: Verify image name and tag

# 2. Private registry authentication
#    - Solution: Create and use imagePullSecrets
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password>

# Add to Pod spec:
# spec:
#   imagePullSecrets:
#   - name: regcred

# 3. Network issues
#    - Solution: Check network policies and firewall rules
```

**Issue: Pod running but not accessible**

```bash
# Check if Pod is ready
kubectl get pod nginx-pod

# Check readiness probe
kubectl describe pod nginx-pod | grep -A 10 "Readiness"

# Test Pod connectivity
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://<pod-ip>:80

# Check service endpoints
kubectl get endpoints
```

**Issue: High memory usage / OOMKilled**

```bash
# Check resource usage
kubectl top pod nginx-pod

# Check events for OOM
kubectl describe pod nginx-pod | grep -i oom

# Solution: Increase memory limits or optimize application
```

### Interview Notes

**Q1: What is the difference between a Pod and a container?**

A: A container is a lightweight, standalone executable package that includes everything needed to run a piece of software. A Pod is a Kubernetes abstraction that wraps one or more containers, providing them with shared networking, storage, and lifecycle management. Pods are the smallest deployable units in Kubernetes, while containers are the actual runtime instances within Pods.

**Q2: Can a Pod contain multiple containers? When would you use this pattern?**

A: Yes, a Pod can contain multiple containers. This is called the "sidecar pattern" and is used when containers need to work together closely. Common use cases include:
- Log shipping (main app + log collector)
- Service mesh proxies (app + Envoy sidecar)
- Configuration watchers (app + config reloader)
- Monitoring agents (app + metrics exporter)

**Q3: What happens when a Pod is deleted?**

A: When a Pod is deleted:
1. Pod status changes to "Terminating"
2. PreStop hooks are executed (if defined)
3. SIGTERM signal is sent to all containers
4. Grace period begins (default 30 seconds)
5. If containers don't exit, SIGKILL is sent after grace period
6. Pod is removed from service endpoints immediately
7. Volumes are unmounted and resources are released
8. Pod object is deleted from etcd

**Q4: How does Kubernetes ensure Pod high availability?**

A: Kubernetes doesn't guarantee Pod availability directly. Instead, it uses higher-level controllers like Deployments, ReplicaSets, and StatefulSets that continuously monitor and maintain the desired number of Pod replicas. If a Pod fails, these controllers automatically create replacement Pods. For true high availability, you should:
- Use Deployments with multiple replicas
- Spread Pods across multiple nodes using anti-affinity
- Use PodDisruptionBudgets to control voluntary disruptions
- Implement proper health checks (liveness and readiness probes)

---

## 2. Services (ClusterIP, NodePort, LoadBalancer)

![Service Types](https://cdn.glitch.global/4bf0a0a2-8f1e-4b0e-b4c6-5e5e5e5e5e5e/service-types.png)

### Concept Explanation (IN DETAIL)

**What is a Service?**

A Kubernetes Service is an abstraction that defines a logical set of Pods and a policy for accessing them. Services provide stable networking endpoints for Pods, which are ephemeral and can be created or destroyed at any time. A Service acts as a load balancer, distributing traffic across multiple Pod replicas.

**Why does it exist?**

Services exist to solve the problem of dynamic Pod IP addresses. In Kubernetes:
- Pods are mortal; they can be killed and recreated at any time
- Each Pod gets a new IP address when recreated
- Applications need a stable way to communicate with other applications
- Multiple Pod replicas need load balancing

Without Services, you would need to track Pod IPs manually and update configurations every time a Pod changes, which is impractical in dynamic environments.

**What problem does it solve?**

Services solve several critical problems:

1. **Service Discovery**: Provides a stable DNS name and IP address for accessing Pods
2. **Load Balancing**: Automatically distributes traffic across healthy Pod replicas
3. **Abstraction**: Decouples service consumers from service providers
4. **High Availability**: Continues routing traffic even when individual Pods fail
5. **External Access**: Provides mechanisms to expose applications outside the cluster

**How it works internally?**

Services work through a combination of:

1. **Label Selectors**: Services use label selectors to identify which Pods belong to them
2. **Endpoints**: Kubernetes automatically creates and maintains an Endpoints object that lists all Pod IPs matching the selector
3. **kube-proxy**: Runs on every node and programs iptables/IPVS rules to route traffic to Pod IPs
4. **DNS**: CoreDNS provides DNS resolution for Service names
5. **Virtual IP**: Each Service gets a stable virtual IP (ClusterIP) that never changes

When a request is made to a Service:
1. Client resolves Service DNS name to ClusterIP
2. Request is sent to the ClusterIP
3. kube-proxy intercepts the request using iptables/IPVS rules
4. Traffic is forwarded to one of the backend Pod IPs
5. Response flows back through the same path

### Architecture / Internal Working

**Step-by-step flow:**

1. **Service Creation**:
   - User submits Service manifest to API Server
   - API Server validates and stores Service in etcd
   - Service is assigned a ClusterIP from the service CIDR range
   - Endpoints controller watches for Pods matching the Service selector

2. **Endpoint Discovery**:
   - Endpoints controller continuously monitors Pods
   - When Pods matching the selector are found, their IPs are added to the Endpoints object
   - When Pods are deleted or become unhealthy, their IPs are removed
   - Endpoints object is updated in real-time

3. **kube-proxy Configuration**:
   - kube-proxy watches for Service and Endpoints changes
   - Programs iptables/IPVS rules on each node
   - Creates rules to DNAT (Destination NAT) ClusterIP to Pod IPs
   - Implements load balancing logic (round-robin by default)

4. **DNS Registration**:
   - CoreDNS watches for new Services
   - Creates DNS A records: `<service-name>.<namespace>.svc.cluster.local`
   - Creates DNS SRV records for named ports
   - Updates DNS records when Services change

5. **Traffic Routing**:
   - Client makes request to Service DNS name or ClusterIP
   - Request hits iptables/IPVS rules on the node
   - Traffic is load-balanced to one of the backend Pods
   - Connection is tracked for session affinity (if configured)

**Service Types:**

**1. ClusterIP (Default)**
- Creates a virtual IP accessible only within the cluster
- Used for internal service-to-service communication
- Most common Service type
- No external access

**2. NodePort**
- Exposes Service on a static port on each node's IP
- Automatically creates ClusterIP Service
- Accessible from outside cluster via `<NodeIP>:<NodePort>`
- Port range: 30000-32767 (configurable)
- Not recommended for production external access

**3. LoadBalancer**
- Creates an external load balancer (cloud provider specific)
- Automatically creates NodePort and ClusterIP Services
- Provides external IP address for accessing the Service
- Requires cloud provider support (AWS ELB, GCP Load Balancer, Azure Load Balancer)
- Most expensive but most robust external access method

**Components Involved:**

- **API Server**: Manages Service lifecycle
- **Endpoints Controller**: Maintains list of Pod IPs
- **kube-proxy**: Implements Service networking on each node
- **CoreDNS**: Provides DNS resolution for Services
- **Cloud Controller Manager**: Provisions external load balancers (for LoadBalancer type)

### YAML Definition (MANDATORY)

**ClusterIP Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: default
  labels:
    app: nginx
  annotations:
    description: "Internal nginx service"
spec:
  # Service type (ClusterIP is default)
  type: ClusterIP
  
  # Pod selector - Service routes traffic to Pods with these labels
  selector:
    app: nginx
    tier: frontend
  
  # Ports configuration
  ports:
  - name: http
    protocol: TCP
    port: 80          # Port exposed by the Service
    targetPort: 8080  # Port on the Pod (can be port number or name)
  - name: https
    protocol: TCP
    port: 443
    targetPort: https # References named port in Pod
  
  # Session affinity (optional)
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
  
  # IP family policy
  ipFamilyPolicy: SingleStack
  ipFamilies:
  - IPv4
```

**NodePort Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
  namespace: default
  labels:
    app: nginx
spec:
  type: NodePort
  
  selector:
    app: nginx
  
  ports:
  - name: http
    protocol: TCP
    port: 80          # ClusterIP port
    targetPort: 8080  # Pod port
    nodePort: 30080   # External port on nodes (optional, auto-assigned if not specified)
  
  # External traffic policy
  externalTrafficPolicy: Local  # Preserves source IP, but may cause uneven load distribution
  # externalTrafficPolicy: Cluster  # Default, better load balancing but loses source IP
```

**LoadBalancer Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-loadbalancer
  namespace: default
  labels:
    app: nginx
  annotations:
    # Cloud provider specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # AWS Network Load Balancer
    service.beta.kubernetes.io/aws-load-balancer-internal: "false"  # Public LB
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
spec:
  type: LoadBalancer
  
  selector:
    app: nginx
  
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  - name: https
    protocol: TCP
    port: 443
    targetPort: 8443
  
  # Load balancer source ranges (IP whitelist)
  loadBalancerSourceRanges:
  - "10.0.0.0/8"
  - "172.16.0.0/12"
  
  # External traffic policy
  externalTrafficPolicy: Local
  
  # Health check node port (when externalTrafficPolicy: Local)
  healthCheckNodePort: 32000
```

**Headless Service (for StatefulSets):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-headless
  namespace: default
spec:
  clusterIP: None  # Makes it headless - no ClusterIP assigned
  
  selector:
    app: nginx
  
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  
  # Publish not-ready addresses (useful for StatefulSets)
  publishNotReadyAddresses: true
```

**Field Explanations:**

- **type**: Service type (ClusterIP, NodePort, LoadBalancer, ExternalName)
- **selector**: Labels used to select backend Pods
- **ports.port**: Port exposed by the Service
- **ports.targetPort**: Port on the Pod where traffic is sent
- **ports.nodePort**: Static port on each node (NodePort only)
- **sessionAffinity**: Sticky sessions based on ClientIP or None
- **externalTrafficPolicy**: 
  - `Cluster`: Load balances across all nodes (default)
  - `Local`: Only routes to Pods on the same node (preserves source IP)
- **loadBalancerSourceRanges**: IP CIDR ranges allowed to access LoadBalancer
- **clusterIP: None**: Creates headless Service (no load balancing, returns Pod IPs directly)

### kubectl Commands

**Creation:**

```bash
# Create Service from YAML
kubectl apply -f service.yaml

# Create ClusterIP Service imperatively
kubectl expose deployment nginx --port=80 --target-port=8080 --name=nginx-service

# Create NodePort Service
kubectl expose deployment nginx --type=NodePort --port=80 --target-port=8080 --name=nginx-nodeport

# Create LoadBalancer Service
kubectl expose deployment nginx --type=LoadBalancer --port=80 --target-port=8080 --name=nginx-lb

# Create Service with specific port
kubectl create service clusterip nginx-service --tcp=80:8080

# Dry run to see YAML
kubectl expose deployment nginx --port=80 --dry-run=client -o yaml
```

**Verification:**

```bash
# List all Services
kubectl get services
kubectl get svc  # Short form

# Get Service details
kubectl describe service nginx-service

# Get Service with endpoints
kubectl get svc nginx-service -o wide

# Get Service YAML
kubectl get svc nginx-service -o yaml

# Check Service endpoints
kubectl get endpoints nginx-service
kubectl describe endpoints nginx-service

# Get Service ClusterIP
kubectl get svc nginx-service -o jsonpath='{.spec.clusterIP}'

# Get LoadBalancer external IP
kubectl get svc nginx-loadbalancer -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# List Services with selectors
kubectl get svc --show-labels

# Watch Service status
kubectl get svc -w
```

**Testing:**

```bash
# Test ClusterIP Service from within cluster
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://nginx-service

# Test using Service DNS
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://nginx-service.default.svc.cluster.local

# Test NodePort Service from outside cluster
curl http://<node-ip>:30080

# Test LoadBalancer Service
curl http://<external-ip>

# Port forward Service to local machine
kubectl port-forward service/nginx-service 8080:80

# Access forwarded Service
curl http://localhost:8080
```

**Debugging:**

```bash
# Check if Service has endpoints
kubectl get endpoints nginx-service

# If no endpoints, check Pod labels
kubectl get pods --show-labels

# Verify Service selector matches Pod labels
kubectl get svc nginx-service -o jsonpath='{.spec.selector}'

# Check Service events
kubectl get events --field-selector involvedObject.name=nginx-service

# Describe Service for detailed info
kubectl describe svc nginx-service

# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy

# Verify DNS resolution
kubectl run test-pod --image=busybox --rm -it -- nslookup nginx-service

# Check iptables rules (on node)
sudo iptables-save | grep nginx-service
```

**Cleanup:**

```bash
# Delete Service
kubectl delete service nginx-service

# Delete Service from YAML
kubectl delete -f service.yaml

# Delete all Services with label
kubectl delete svc -l app=nginx

# Delete Service and associated resources
kubectl delete deployment,service nginx
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Selector Mismatch**
   - Service selector doesn't match Pod labels
   - Typos in label names or values
   - Result: No endpoints, traffic doesn't reach Pods

2. **Port Configuration Errors**
   - Wrong targetPort (doesn't match container port)
   - Mixing up port and targetPort
   - Result: Connection refused errors

3. **Service Type Confusion**
   - Using ClusterIP when external access is needed
   - Using LoadBalancer without cloud provider support
   - Result: Service not accessible as expected

4. **Session Affinity Issues**
   - Not configuring sessionAffinity when needed
   - Timeout too short for long-running sessions
   - Result: Session loss, authentication failures

5. **External Traffic Policy Misunderstanding**
   - Using Local without understanding implications
   - Not considering source IP preservation needs
   - Result: Uneven load distribution or lost source IPs

**Troubleshooting Guide:**

**Issue: Service has no endpoints**

```bash
# Check endpoints
kubectl get endpoints nginx-service

# If empty, verify:
# 1. Pod labels match Service selector
kubectl get pods --show-labels
kubectl get svc nginx-service -o jsonpath='{.spec.selector}'

# 2. Pods are running and ready
kubectl get pods

# 3. Pods are in same namespace as Service
kubectl get pods -n <namespace>

# Solution: Fix label mismatch or ensure Pods are ready
```

**Issue: Cannot access Service (Connection refused)**

```bash
# 1. Verify Service exists and has endpoints
kubectl get svc nginx-service
kubectl get endpoints nginx-service

# 2. Check if Pods are listening on correct port
kubectl exec <pod-name> -- netstat -tlnp

# 3. Test from within cluster
kubectl run test --image=busybox --rm -it -- wget -O- http://nginx-service

# 4. Check targetPort matches container port
kubectl get svc nginx-service -o yaml | grep targetPort
kubectl get pod <pod-name> -o yaml | grep containerPort

# Solution: Correct targetPort in Service definition
```

**Issue: NodePort not accessible**

```bash
# 1. Verify NodePort Service exists
kubectl get svc nginx-nodeport

# 2. Get NodePort number
kubectl get svc nginx-nodeport -o jsonpath='{.spec.ports[0].nodePort}'

# 3. Check firewall rules allow NodePort range (30000-32767)
# On cloud providers, check security groups

# 4. Verify nodes are reachable
ping <node-ip>

# 5. Test from outside cluster
curl http://<node-ip>:<nodeport>

# Solution: Open firewall ports or use LoadBalancer type
```

**Issue: LoadBalancer stuck in Pending**

```bash
# Check Service status
kubectl describe svc nginx-loadbalancer

# Common causes:
# 1. Cloud provider not configured
#    - Verify cluster has cloud provider integration
#    - Check cloud controller manager logs

# 2. Insufficient cloud provider quota
#    - Check cloud provider console for limits

# 3. Invalid annotations
#    - Verify cloud-specific annotations are correct

# Solution: Configure cloud provider or use NodePort/Ingress
```

**Issue: Uneven load distribution**

```bash
# Check externalTrafficPolicy
kubectl get svc nginx-service -o jsonpath='{.spec.externalTrafficPolicy}'

# If "Local":
# - Traffic only goes to Pods on the same node
# - Can cause uneven distribution if Pods are not evenly spread

# Solution: 
# 1. Change to "Cluster" for better distribution
kubectl patch svc nginx-service -p '{"spec":{"externalTrafficPolicy":"Cluster"}}'

# 2. Or ensure Pods are evenly distributed across nodes using pod anti-affinity
```

**Issue: Session affinity not working**

```bash
# Check session affinity configuration
kubectl get svc nginx-service -o yaml | grep -A 5 sessionAffinity

# Verify:
# 1. sessionAffinity is set to ClientIP
# 2. timeoutSeconds is appropriate for your use case

# Test session affinity
for i in {1..10}; do curl http://<service-ip>; done

# Solution: Configure sessionAffinity correctly
```

### Interview Notes

**Q1: What is the difference between ClusterIP, NodePort, and LoadBalancer Services?**

A: 
- **ClusterIP**: Creates a virtual IP accessible only within the cluster. Used for internal communication between services. No external access.
- **NodePort**: Exposes the Service on a static port (30000-32767) on each node's IP. Accessible from outside the cluster via `<NodeIP>:<NodePort>`. Automatically creates a ClusterIP Service.
- **LoadBalancer**: Provisions an external load balancer (cloud provider specific) and assigns an external IP. Automatically creates NodePort and ClusterIP Services. Best for production external access but requires cloud provider support.

**Q2: How does a Service know which Pods to route traffic to?**

A: Services use label selectors to identify backend Pods. The Endpoints controller continuously watches for Pods that match the Service's selector and maintains an Endpoints object with their IP addresses. kube-proxy then uses these endpoints to configure routing rules (iptables/IPVS) on each node.

**Q3: What is the purpose of externalTrafficPolicy and what are its options?**

A: externalTrafficPolicy controls how external traffic is routed to Pods:
- **Cluster** (default): Distributes traffic across all Pods in the cluster, potentially forwarding to Pods on other nodes. Better load distribution but loses source IP.
- **Local**: Only routes to Pods on the same node that received the traffic. Preserves source IP but may cause uneven load distribution if Pods aren't evenly spread across nodes.

**Q4: What is a headless Service and when would you use it?**

A: A headless Service (clusterIP: None) doesn't perform load balancing or assign a ClusterIP. Instead, DNS queries return the IP addresses of all Pods directly. Used for:
- StatefulSets where each Pod needs a stable network identity
- Client-side load balancing
- Service discovery where clients need to know all Pod IPs
- Database clusters where clients need to connect to specific instances

---

## 3. kube-proxy & Service Traffic Flow

![kube-proxy Traffic Flow](https://cdn.glitch.global/4bf0a0a2-8f1e-4b0e-b4c6-5e5e5e5e5e5e/kube-proxy-flow.png)

### Concept Explanation (IN DETAIL)

**What is kube-proxy?**

kube-proxy is a network proxy that runs on each node in a Kubernetes cluster. It maintains network rules that allow network communication to Pods from inside or outside the cluster. It's responsible for implementing the Service abstraction by routing traffic to the appropriate backend Pods.

**Why does it exist?**

kube-proxy exists to bridge the gap between the virtual Service IPs (ClusterIPs) and the actual Pod IPs. Services provide stable endpoints, but the actual Pods behind them are dynamic and can change at any time. kube-proxy watches for changes in Services and Endpoints and updates the node's networking rules accordingly, ensuring traffic always reaches healthy Pods.

**What problem does it solve?**

kube-proxy solves several critical networking problems:

1. **Service Abstraction**: Translates virtual Service IPs to real Pod IPs
2. **Load Balancing**: Distributes traffic across multiple Pod replicas
3. **High Availability**: Automatically removes unhealthy Pods from rotation
4. **Dynamic Updates**: Adapts to Pod changes without manual intervention
5. **Session Affinity**: Maintains sticky sessions when required
6. **Network Address Translation**: Performs NAT to route traffic correctly

**How it works internally?**

kube-proxy operates in one of three modes:

**1. iptables mode (default)**:
- Creates iptables rules for each Service
- Uses DNAT (Destination NAT) to rewrite destination IPs
- Performs random load balancing
- No userspace proxy overhead
- Most common and performant for moderate scale

**2. IPVS mode**:
- Uses Linux IPVS (IP Virtual Server) for load balancing
- More efficient than iptables for large numbers of Services
- Supports multiple load balancing algorithms (round-robin, least connection, etc.)
- Better performance at scale
- Requires IPVS kernel modules

**3. userspace mode (legacy)**:
- kube-proxy acts as an actual proxy
- Copies packets between client and Pod
- Highest overhead, rarely used
- Deprecated in favor of iptables/IPVS

**Traffic Flow Process:**

1. Client sends request to Service DNS name
2. DNS resolves to Service ClusterIP
3. Packet arrives at node with destination = ClusterIP
4. iptables/IPVS rules intercept the packet
5. Destination IP is rewritten to a Pod IP (DNAT)
6. Packet is routed to the Pod
7. Pod processes request and sends response
8. Response is routed back through the node
9. Source NAT (SNAT) may be applied depending on configuration
10. Response reaches the original client

### Architecture / Internal Working

**Step-by-step flow:**

**1. Service and Endpoints Creation:**
- User creates a Service with a selector
- API Server assigns a ClusterIP from the service CIDR
- Endpoints controller identifies matching Pods
- Endpoints object is created with Pod IPs

**2. kube-proxy Watches:**
- kube-proxy on each node watches API Server for:
  - New Services
  - Service updates
  - Endpoints changes
- Uses efficient watch mechanism to minimize API calls

**3. Rule Programming (iptables mode):**

When a Service is created, kube-proxy creates several iptables chains:

```
KUBE-SERVICES (main entry point)
    ↓
KUBE-SVC-XXX (per-service chain)
    ↓
KUBE-SEP-XXX (per-endpoint chain)
    ↓
Pod IP (DNAT)
```

**Detailed iptables rules:**

```bash
# Main entry point - all traffic goes through this
-A PREROUTING -j KUBE-SERVICES

# Service chain - matches ClusterIP
-A KUBE-SERVICES -d 10.96.0.10/32 -p tcp -m tcp --dport 80 -j KUBE-SVC-NGINX

# Service chain - load balances to endpoints
-A KUBE-SVC-NGINX -m statistic --mode random --probability 0.33 -j KUBE-SEP-ENDPOINT1
-A KUBE-SVC-NGINX -m statistic --mode random --probability 0.50 -j KUBE-SEP-ENDPOINT2
-A KUBE-SVC-NGINX -j KUBE-SEP-ENDPOINT3

# Endpoint chains - DNAT to Pod IPs
-A KUBE-SEP-ENDPOINT1 -p tcp -m tcp -j DNAT --to-destination 10.244.1.5:8080
-A KUBE-SEP-ENDPOINT2 -p tcp -m tcp -j DNAT --to-destination 10.244.2.3:8080
-A KUBE-SEP-ENDPOINT3 -p tcp -m tcp -j DNAT --to-destination 10.244.3.7:8080
```

**4. Traffic Routing:**

**Scenario 1: Pod-to-Service communication (same node)**
1. Pod A sends packet to Service ClusterIP (10.96.0.10:80)
2. Packet hits KUBE-SERVICES chain in iptables
3. Matches KUBE-SVC-NGINX chain
4. Random selection chooses KUBE-SEP-ENDPOINT2
5. DNAT rewrites destination to 10.244.2.3:8080
6. Packet is routed to Pod B on the same node
7. Response follows reverse path with SNAT

**Scenario 2: Pod-to-Service communication (different nodes)**
1. Pod A on Node 1 sends packet to Service ClusterIP
2. iptables on Node 1 performs DNAT to Pod B IP (10.244.2.3)
3. Pod B is on Node 2
4. Packet is routed through the CNI network to Node 2
5. Packet arrives at Pod B
6. Response is routed back to Node 1, then to Pod A

**Scenario 3: External-to-Service (NodePort)**
1. External client sends packet to Node IP:NodePort
2. iptables DNAT rewrites destination to ClusterIP:Port
3. Second DNAT rewrites to Pod IP:TargetPort
4. Packet is routed to Pod
5. Response goes back through node
6. SNAT may be applied to preserve routing

**5. IPVS Mode Differences:**

In IPVS mode, kube-proxy:
- Creates a dummy interface (kube-ipvs0) with all Service ClusterIPs
- Uses IPVS to load balance to real servers (Pod IPs)
- Still uses iptables for some packet filtering
- Provides better performance and more load balancing algorithms

**6. Session Affinity:**

When sessionAffinity: ClientIP is set:
- iptables uses the `recent` module to track client IPs
- Subsequent requests from the same client go to the same Pod
- Timeout is configurable (default 10800 seconds)

**Components Involved:**

- **kube-proxy**: Watches Services/Endpoints and programs rules
- **iptables/IPVS**: Kernel-level packet filtering and routing
- **Netfilter**: Linux kernel framework for packet manipulation
- **Conntrack**: Connection tracking for stateful packet filtering
- **CNI Plugin**: Provides Pod networking and routing between nodes

### YAML Definition (MANDATORY)

kube-proxy is typically configured via a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    
    # Proxy mode: iptables, ipvs, or userspace
    mode: "iptables"
    
    # Cluster CIDR for source IP preservation
    clusterCIDR: "10.244.0.0/16"
    
    # iptables configuration
    iptables:
      masqueradeAll: false
      masqueradeBit: 14
      minSyncPeriod: 0s
      syncPeriod: 30s
    
    # IPVS configuration (if mode: ipvs)
    ipvs:
      minSyncPeriod: 0s
      syncPeriod: 30s
      scheduler: "rr"  # round-robin, lc (least connection), dh, sh, sed, nq
      strictARP: false
      tcpTimeout: 0s
      tcpFinTimeout: 0s
      udpTimeout: 0s
    
    # Connection tracking
    conntrack:
      maxPerCore: 32768
      min: 131072
      tcpCloseWaitTimeout: 1h0m0s
      tcpEstablishedTimeout: 24h0m0s
    
    # Metrics and monitoring
    metricsBindAddress: "0.0.0.0:10249"
    
    # Feature gates
    featureGates:
      EndpointSliceProxying: true
    
    # Node port address
    nodePortAddresses: []
    
    # Health check
    healthzBindAddress: "0.0.0.0:10256"
```

**DaemonSet for kube-proxy:**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy
  namespace: kube-system
  labels:
    k8s-app: kube-proxy
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  template:
    metadata:
      labels:
        k8s-app: kube-proxy
    spec:
      hostNetwork: true  # Uses host network namespace
      priorityClassName: system-node-critical
      
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy:v1.24.0
        command:
        - /usr/local/bin/kube-proxy
        - --config=/var/lib/kube-proxy/config.conf
        - --hostname-override=$(NODE_NAME)
        
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        
        securityContext:
          privileged: true  # Needs to modify iptables
        
        volumeMounts:
        - name: kube-proxy
          mountPath: /var/lib/kube-proxy
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
      
      volumes:
      - name: kube-proxy
        configMap:
          name: kube-proxy
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: lib-modules
        hostPath:
          path: /lib/modules
      
      tolerations:
      - operator: Exists  # Runs on all nodes including master
```

**Field Explanations:**

- **mode**: Proxy mode (iptables, ipvs, userspace)
- **clusterCIDR**: Pod network CIDR for source IP preservation
- **iptables.syncPeriod**: How often to sync iptables rules
- **ipvs.scheduler**: Load balancing algorithm for IPVS mode
- **conntrack.maxPerCore**: Maximum connection tracking entries per CPU core
- **metricsBindAddress**: Address for exposing metrics
- **healthzBindAddress**: Address for health check endpoint
- **hostNetwork: true**: kube-proxy must use host network to access iptables

### kubectl Commands

**Verification:**

```bash
# Check kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy

# Check kube-proxy configuration
kubectl get configmap kube-proxy -n kube-system -o yaml

# Check kube-proxy mode
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using"

# Check kube-proxy metrics
kubectl get --raw /api/v1/nodes/<node-name>/proxy/metrics

# Verify kube-proxy is running on all nodes
kubectl get pods -n kube-system -l k8s-app=kube-proxy -o wide
```

**Debugging:**

```bash
# Check iptables rules (on node)
sudo iptables-save | grep KUBE

# List all Service chains
sudo iptables-save | grep KUBE-SVC

# List all endpoint chains
sudo iptables-save | grep KUBE-SEP

# Check specific Service rules
sudo iptables-save | grep <service-name>

# Check IPVS configuration (if using IPVS mode)
sudo ipvsadm -Ln

# Check connection tracking
sudo conntrack -L | grep <service-ip>

# Test Service connectivity
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://<service-ip>

# Check kube-proxy health
curl http://<node-ip>:10256/healthz

# Restart kube-proxy
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
```

**Configuration Changes:**

```bash
# Edit kube-proxy ConfigMap
kubectl edit configmap kube-proxy -n kube-system

# Restart kube-proxy to apply changes
kubectl delete pod -n kube-system -l k8s-app=kube-proxy

# Change to IPVS mode
kubectl patch configmap kube-proxy -n kube-system --type merge -p '{"data":{"config.conf":"mode: ipvs"}}'

# Verify mode change
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using"
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Not Understanding Proxy Modes**
   - Using iptables mode with thousands of Services (performance issues)
   - Not installing IPVS kernel modules when using IPVS mode
   - Result: Poor performance or kube-proxy crashes

2. **Firewall Conflicts**
   - Other firewall rules interfering with kube-proxy rules
   - iptables rules being overwritten by other tools
   - Result: Service traffic not reaching Pods

3. **Connection Tracking Limits**
   - Not tuning conntrack limits for high-traffic clusters
   - Result: Connection drops, "nf_conntrack: table full" errors

4. **Source IP Preservation Issues**
   - Not understanding externalTrafficPolicy implications
   - Not configuring masqueradeAll correctly
   - Result: Lost source IPs or routing problems

5. **Node Network Configuration**
   - Incorrect clusterCIDR configuration
   - Missing routes between nodes
   - Result: Cross-node Pod communication failures

**Troubleshooting Guide:**

**Issue: Service not accessible**

```bash
# 1. Verify kube-proxy is running
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# 2. Check kube-proxy logs for errors
kubectl logs -n kube-system -l k8s-app=kube-proxy

# 3. Verify iptables rules exist for the Service
sudo iptables-save | grep <service-name>

# 4. Check if Service has endpoints
kubectl get endpoints <service-name>

# 5. Test from within cluster
kubectl run test --image=busybox --rm -it -- wget -O- http://<service-ip>

# Solution: Restart kube-proxy or check Service configuration
kubectl delete pod -n kube-system -l k8s-app=kube-proxy
```

**Issue: High latency or connection timeouts**

```bash
# 1. Check connection tracking table
sudo conntrack -L | wc -l
sudo sysctl net.netfilter.nf_conntrack_max

# 2. Check for "table full" errors
dmesg | grep "nf_conntrack: table full"

# 3. Increase conntrack limits
sudo sysctl -w net.netfilter.nf_conntrack_max=1000000
sudo sysctl -w net.netfilter.nf_conntrack_buckets=250000

# 4. Make permanent in /etc/sysctl.conf
echo "net.netfilter.nf_conntrack_max=1000000" >> /etc/sysctl.conf
echo "net.netfilter.nf_conntrack_buckets=250000" >> /etc/sysctl.conf

# 5. Consider switching to IPVS mode for better performance
```

**Issue: Uneven load distribution**

```bash
# 1. Check iptables probability distribution
sudo iptables-save | grep <service-name> | grep probability

# 2. Verify all endpoints are healthy
kubectl get endpoints <service-name>

# 3. Check if externalTrafficPolicy is set to Local
kubectl get svc <service-name> -o jsonpath='{.spec.externalTrafficPolicy}'

# If Local, Pods must be evenly distributed across nodes
# Solution: Use Cluster policy or spread Pods with anti-affinity
```

**Issue: Source IP is lost**

```bash
# 1. Check externalTrafficPolicy
kubectl get svc <service-name> -o jsonpath='{.spec.externalTrafficPolicy}'

# 2. If Cluster, source IP will be lost due to SNAT
# Solution: Change to Local to preserve source IP
kubectl patch svc <service-name> -p '{"spec":{"externalTrafficPolicy":"Local"}}'

# 3. Verify masqueradeAll setting in kube-proxy config
kubectl get configmap kube-proxy -n kube-system -o yaml | grep masqueradeAll

# 4. If masqueradeAll is true, all traffic is SNATed
# Solution: Set to false if source IP preservation is needed
```

**Issue: kube-proxy not updating rules**

```bash
# 1. Check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy

# 2. Verify API Server connectivity
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "connection refused"

# 3. Check if iptables lock is held
sudo lsof /run/xtables.lock

# 4. Restart kube-proxy
kubectl delete pod -n kube-system -l k8s-app=kube-proxy

# 5. Verify rules are updated
sudo iptables-save | grep <service-name>
```

**Issue: IPVS mode not working**

```bash
# 1. Check if IPVS kernel modules are loaded
lsmod | grep ip_vs

# 2. Load required modules
sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh
sudo modprobe nf_conntrack

# 3. Install ipvsadm tool
sudo apt-get install ipvsadm  # Ubuntu/Debian
sudo yum install ipvsadm       # CentOS/RHEL

# 4. Verify IPVS configuration
sudo ipvsadm -Ln

# 5. Check kube-proxy mode
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using"
```

### Interview Notes

**Q1: How does kube-proxy implement Service load balancing?**

A: kube-proxy implements load balancing using either iptables or IPVS. In iptables mode (default), it creates iptables rules that use random probability to distribute traffic across backend Pods. For example, with 3 Pods, it creates rules with probabilities 33%, 50%, and 100% for the remaining traffic. In IPVS mode, it uses the Linux IPVS module which provides more efficient load balancing with multiple algorithms (round-robin, least connection, etc.) and better performance at scale.

**Q2: What is the difference between iptables and IPVS modes in kube-proxy?**

A: 
- **iptables mode**: Uses iptables rules for packet filtering and NAT. Random load balancing. Good for moderate scale (up to ~5000 Services). Higher CPU overhead with many Services.
- **IPVS mode**: Uses Linux IPVS (IP Virtual Server) for load balancing. More efficient with better performance at scale. Supports multiple load balancing algorithms (rr, lc, dh, sh, sed, nq). Better for large clusters with thousands of Services. Requires IPVS kernel modules.

**Q3: How does session affinity work in Kubernetes Services?**

A: Session affinity (sticky sessions) is implemented using the iptables `recent` module when sessionAffinity is set to ClientIP. kube-proxy creates rules that track client IP addresses and ensure subsequent requests from the same client go to the same backend Pod. The affinity timeout is configurable (default 10800 seconds / 3 hours). This is useful for applications that maintain session state but doesn't work across Pod restarts.

**Q4: What happens to in-flight connections when a Pod is deleted?**

A: When a Pod is deleted:
1. Pod is removed from Service endpoints immediately
2. kube-proxy updates iptables/IPVS rules to stop sending new traffic to that Pod
3. Existing connections (in-flight) continue until they complete or timeout
4. The Pod enters "Terminating" state and receives SIGTERM
5. PreStop hooks run (if defined)
6. After grace period (default 30s), SIGKILL is sent
7. Connection tracking entries eventually expire

To handle this gracefully, applications should implement proper shutdown procedures and use readiness probes to signal when they're no longer accepting new connections.

---

## 4. Deployments

![Deployment Architecture](https://cdn.glitch.global/4bf0a0a2-8f1e-4b0e-b4c6-5e5e5e5e5e5e/deployment-replicaset-pod.png)

### Concept Explanation (IN DETAIL)

**What is a Deployment?**

A Deployment is a higher-level Kubernetes resource that provides declarative updates for Pods and ReplicaSets. It's the most common way to run stateless applications in Kubernetes. A Deployment manages ReplicaSets, which in turn manage Pods, providing features like rolling updates, rollbacks, scaling, and self-healing.

**Why does it exist?**

Deployments exist to simplify application lifecycle management. Before Deployments, users had to manually manage ReplicaSets and handle updates carefully. Deployments automate this process, making it easy to:
- Deploy new versions of applications
- Roll back to previous versions if issues occur
- Scale applications up or down
- Ensure desired number of replicas are always running
- Perform zero-downtime updates

**What problem does it solve?**

Deployments solve several critical operational problems:

1. **Declarative Updates**: Describe desired state, Kubernetes handles the transition
2. **Rolling Updates**: Update applications without downtime
3. **Rollback Capability**: Quickly revert to previous versions if issues occur
4. **Self-Healing**: Automatically replaces failed Pods
5. **Scaling**: Easily adjust number of replicas
6. **Version History**: Maintains revision history for auditing and rollbacks
7. **Progressive Rollout**: Control update speed and pause/resume updates

**How it works internally?**

Deployments work through a controller pattern:

1. **Deployment Controller**: Watches for Deployment objects and manages ReplicaSets
2. **ReplicaSet Controller**: Ensures correct number of Pod replicas are running
3. **Scheduler**: Places Pods on appropriate nodes
4. **Kubelet**: Runs Pods on nodes

When you create or update a Deployment:
1. Deployment controller creates/updates a ReplicaSet with the new Pod template
2. ReplicaSet controller creates new Pods based on the template
3. During updates, a new ReplicaSet is created while the old one is scaled down
4. The process continues until all Pods are updated (rolling update)
5. Old ReplicaSets are kept for rollback purposes (configurable retention)

### Architecture / Internal Working

**Step-by-step flow:**

**1. Deployment Creation:**

```
User creates Deployment
    ↓
API Server validates and stores in etcd
    ↓
Deployment Controller watches for new Deployments
    ↓
Creates ReplicaSet with Pod template
    ↓
ReplicaSet Controller creates Pods
    ↓
Scheduler assigns Pods to nodes
    ↓
Kubelet starts containers
```

**2. Rolling Update Process:**

```
User updates Deployment (new image version)
    ↓
Deployment Controller detects change
    ↓
Creates new ReplicaSet with updated template
    ↓
Scales up new ReplicaSet (creates new Pods)
    ↓
Waits for new Pods to be ready
    ↓
Scales down old ReplicaSet (deletes old Pods)
    ↓
Repeats until all Pods are updated
    ↓
Marks update as complete
```

**Update Strategy Details:**

**RollingUpdate (default):**
- Creates new Pods before deleting old ones
- Controlled by maxSurge and maxUnavailable
- **maxSurge**: Maximum number of Pods above desired count during update
  - Example: replicas=10, maxSurge=2 → can have up to 12 Pods during update
- **maxUnavailable**: Maximum number of Pods that can be unavailable during update
  - Example: replicas=10, maxUnavailable=1 → at least 9 Pods must be available

**Recreate:**
- Deletes all old Pods before creating new ones
- Causes downtime but ensures no mixed versions
- Useful for applications that can't run multiple versions simultaneously

**3. Rollback Process:**

```
User triggers rollback
    ↓
Deployment Controller identifies previous ReplicaSet
    ↓
Scales up previous ReplicaSet
    ↓
Scales down current ReplicaSet
    ↓
Restores to previous state
```

**4. Scaling Process:**

```
User changes replicas count
    ↓
Deployment Controller updates ReplicaSet
    ↓
ReplicaSet Controller adjusts Pod count
    ↓
Scale up: Creates new Pods
Scale down: Deletes excess Pods
```

**Components Involved:**

- **Deployment Controller**: Manages Deployment lifecycle and ReplicaSets
- **ReplicaSet Controller**: Ensures desired number of Pods are running
- **API Server**: Stores Deployment state in etcd
- **Scheduler**: Assigns new Pods to nodes
- **Kubelet**: Manages Pod lifecycle on nodes

**Deployment States:**

- **Progressing**: Update is in progress
- **Complete**: All replicas updated successfully
- **Failed**: Update failed (e.g., image pull error)

### YAML Definition (MANDATORY)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
  labels:
    app: nginx
    environment: production
  annotations:
    kubernetes.io/change-cause: "Update to nginx 1.21.6"
spec:
  # Number of desired Pods
  replicas: 3
  
  # Selector to identify Pods managed by this Deployment
  selector:
    matchLabels:
      app: nginx
  
  # Update strategy
  strategy:
    type: RollingUpdate  # or Recreate
    rollingUpdate:
      maxSurge: 1        # Max Pods above desired during update (can be number or percentage)
      maxUnavailable: 0  # Max Pods unavailable during update (can be number or percentage)
  
  # Minimum time for Pod to be ready before considering it available
  minReadySeconds: 10
  
  # Number of old ReplicaSets to retain for rollback
  revisionHistoryLimit: 10
  
  # Seconds before Deployment is considered failed
  progressDeadlineSeconds: 600
  
  # Pause rollout (useful for canary deployments)
  paused: false
  
  # Pod template
  template:
    metadata:
      labels:
        app: nginx
        version: "1.21.6"
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9113"
    spec:
      containers:
      - name: nginx
        image: nginx:1.21.6
        imagePullPolicy: IfNotPresent  # Always, Never, or IfNotPresent
        
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        
        # Resource management
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        
        # Environment variables
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        
        # Volume mounts
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        - name: cache
          mountPath: /var/cache/nginx
        
        # Liveness probe - restart if fails
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        
        # Readiness probe - remove from service if fails
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        
        # Lifecycle hooks
        lifecycle:
          postStart:
            exec:
              command: ["/bin/sh", "-c", "echo 'Container started' > /tmp/started"]
          preStop:
            exec:
              command: ["/bin/sh", "-c", "nginx -s quit; while killall -0 nginx; do sleep 1; done"]
      
      # Init containers
      initContainers:
      - name: init-config
        image: busybox:1.35
        command: ['sh', '-c', 'echo "Initializing configuration..." && sleep 5']
      
      # Volumes
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
      - name: cache
        emptyDir: {}
      
      # Scheduling constraints
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - nginx
              topologyKey: kubernetes.io/hostname
      
      # Node selection
      nodeSelector:
        disktype: ssd
      
      # Tolerations
      tolerations:
      - key: "key1"
        operator: "Equal"
        value: "value1"
        effect: "NoSchedule"
      
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      
      # Restart policy
      restartPolicy: Always
      
      # Service account
      serviceAccountName: default
      
      # DNS policy
      dnsPolicy: ClusterFirst
      
      # Termination grace period
      terminationGracePeriodSeconds: 30
```

**Field Explanations:**

- **replicas**: Desired number of Pod replicas
- **selector.matchLabels**: Labels used to identify Pods managed by this Deployment
- **strategy.type**: Update strategy (RollingUpdate or Recreate)
- **maxSurge**: Maximum number of Pods above desired count during update
- **maxUnavailable**: Maximum number of Pods that can be unavailable during update
- **minReadySeconds**: Minimum time for Pod to be ready before considering it available
- **revisionHistoryLimit**: Number of old ReplicaSets to retain for rollback
- **progressDeadlineSeconds**: Time before Deployment is considered failed
- **template**: Pod template specification (same as Pod spec)
- **annotations.kubernetes.io/change-cause**: Records reason for change (shows in rollout history)

### kubectl Commands

**Creation:**

```bash
# Create Deployment from YAML
kubectl apply -f deployment.yaml

# Create Deployment imperatively
kubectl create deployment nginx --image=nginx:1.21.6 --replicas=3

# Create with port exposure
kubectl create deployment nginx --image=nginx --port=80

# Create with resource limits
kubectl create deployment nginx --image=nginx --replicas=3 \
  --requests='cpu=100m,memory=128Mi' --limits='cpu=200m,memory=256Mi'

# Dry run to see YAML
kubectl create deployment nginx --image=nginx --replicas=3 --dry-run=client -o yaml
```

**Verification:**

```bash
# List all Deployments
kubectl get deployments
kubectl get deploy  # Short form

# Get Deployment details
kubectl describe deployment nginx-deployment

# Get Deployment with ReplicaSets and Pods
kubectl get deployment,replicaset,pod -l app=nginx

# Get Deployment status
kubectl rollout status deployment/nginx-deployment

# Get Deployment YAML
kubectl get deployment nginx-deployment -o yaml

# Watch Deployment status
kubectl get deployment nginx-deployment -w

# Get Deployment events
kubectl get events --field-selector involvedObject.name=nginx-deployment

# Check Deployment conditions
kubectl get deployment nginx-deployment -o jsonpath='{.status.conditions[*].type}'
```

**Scaling:**

```bash
# Scale Deployment
kubectl scale deployment nginx-deployment --replicas=5

# Scale with timeout
kubectl scale deployment nginx-deployment --replicas=5 --timeout=60s

# Autoscale (creates HPA)
kubectl autoscale deployment nginx-deployment --min=3 --max=10 --cpu-percent=80

# Check scaling status
kubectl get deployment nginx-deployment
kubectl get hpa
```

**Updates:**

```bash
# Update image
kubectl set image deployment/nginx-deployment nginx=nginx:1.22.0

# Update with record (adds to rollout history)
kubectl set image deployment/nginx-deployment nginx=nginx:1.22.0 --record

# Update multiple containers
kubectl set image deployment/nginx-deployment nginx=nginx:1.22.0 sidecar=sidecar:2.0

# Update resources
kubectl set resources deployment nginx-deployment -c=nginx --limits=cpu=200m,memory=512Mi

# Edit Deployment directly
kubectl edit deployment nginx-deployment

# Patch Deployment
kubectl patch deployment nginx-deployment -p '{"spec":{"replicas":5}}'

# Replace Deployment
kubectl replace -f deployment.yaml

# Apply changes from file
kubectl apply -f deployment.yaml
```

**Rollout Management:**

```bash
# Check rollout status
kubectl rollout status deployment/nginx-deployment

# View rollout history
kubectl rollout history deployment/nginx-deployment

# View specific revision
kubectl rollout history deployment/nginx-deployment --revision=2

# Pause rollout (useful for canary deployments)
kubectl rollout pause deployment/nginx-deployment

# Resume rollout
kubectl rollout resume deployment/nginx-deployment

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=2

# Restart Deployment (recreates all Pods)
kubectl rollout restart deployment/nginx-deployment
```

**Debugging:**

```bash
# Get Deployment logs
kubectl logs deployment/nginx-deployment

# Get logs from specific container
kubectl logs deployment/nginx-deployment -c nginx

# Follow logs
kubectl logs -f deployment/nginx-deployment

# Get logs from previous instance
kubectl logs deployment/nginx-deployment --previous

# Execute command in Deployment Pod
kubectl exec deployment/nginx-deployment -- ls /usr/share/nginx/html

# Interactive shell
kubectl exec -it deployment/nginx-deployment -- /bin/bash

# Port forward
kubectl port-forward deployment/nginx-deployment 8080:80

# Check resource usage
kubectl top deployment nginx-deployment
kubectl top pods -l app=nginx

# Get Pod IPs
kubectl get pods -l app=nginx -o wide
```

**Cleanup:**

```bash
# Delete Deployment (also deletes ReplicaSets and Pods)
kubectl delete deployment nginx-deployment

# Delete from file
kubectl delete -f deployment.yaml

# Delete with cascade options
kubectl delete deployment nginx-deployment --cascade=orphan  # Keeps Pods
kubectl delete deployment nginx-deployment --cascade=background  # Default
kubectl delete deployment nginx-deployment --cascade=foreground  # Waits for Pods

# Force delete
kubectl delete deployment nginx-deployment --force --grace-period=0

# Delete all Deployments with label
kubectl delete deployments -l app=nginx
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Selector Mismatch**
   - Deployment selector doesn't match Pod template labels
   - Result: Deployment can't manage Pods, stuck in progressing state

2. **Image Pull Errors**
   - Wrong image name or tag
   - Private registry without imagePullSecrets
   - Result: Pods stuck in ImagePullBackOff

3. **Resource Constraints**
   - Insufficient cluster resources for desired replicas
   - Requests too high, no nodes can accommodate Pods
   - Result: Pods stuck in Pending state

4. **Readiness Probe Failures**
   - Probe configuration incorrect or too aggressive
   - Application takes longer to start than probe allows
   - Result: Pods never become ready, rollout stuck

5. **Update Strategy Issues**
   - maxUnavailable=0 and maxSurge=0 (impossible to update)
   - maxUnavailable too high (causes service disruption)
   - Result: Update fails or causes downtime

**Troubleshooting Guide:**

**Issue: Deployment stuck in Progressing state**

```bash
# Check Deployment status
kubectl rollout status deployment/nginx-deployment

# Check Deployment conditions
kubectl describe deployment nginx-deployment

# Check ReplicaSets
kubectl get rs -l app=nginx

# Check Pod status
kubectl get pods -l app=nginx

# Common causes:
# 1. Image pull errors
kubectl describe pod <pod-name> | grep -A 10 "Events"

# 2. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Readiness probe failures
kubectl logs <pod-name>
kubectl describe pod <pod-name> | grep -A 10 "Readiness"

# Solution: Fix the underlying issue and Deployment will progress
```

**Issue: Pods not updating to new version**

```bash
# Check if rollout is paused
kubectl get deployment nginx-deployment -o jsonpath='{.spec.paused}'

# Resume if paused
kubectl rollout resume deployment/nginx-deployment

# Check rollout status
kubectl rollout status deployment/nginx-deployment

# Verify image version in Deployment
kubectl get deployment nginx-deployment -o jsonpath='{.spec.template.spec.containers[0].image}'

# Verify image version in running Pods
kubectl get pods -l app=nginx -o jsonpath='{.items[*].spec.containers[0].image}'

# If images don't match, check for errors
kubectl describe deployment nginx-deployment
```

**Issue: Rollback not working**

```bash
# Check rollout history
kubectl rollout history deployment/nginx-deployment

# If history is empty, check revisionHistoryLimit
kubectl get deployment nginx-deployment -o jsonpath='{.spec.revisionHistoryLimit}'

# If 0, old ReplicaSets are deleted immediately
# Solution: Set revisionHistoryLimit to retain history
kubectl patch deployment nginx-deployment -p '{"spec":{"revisionHistoryLimit":10}}'

# Verify old ReplicaSets exist
kubectl get rs -l app=nginx

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=<number>
```

**Issue: Uneven Pod distribution across nodes**

```bash
# Check Pod distribution
kubectl get pods -l app=nginx -o wide

# Check if podAntiAffinity is configured
kubectl get deployment nginx-deployment -o yaml | grep -A 20 "affinity"

# Add pod anti-affinity to spread Pods
kubectl patch deployment nginx-deployment --type=json -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/affinity",
    "value": {
      "podAntiAffinity": {
        "preferredDuringSchedulingIgnoredDuringExecution": [{
          "weight": 100,
          "podAffinityTerm": {
            "labelSelector": {
              "matchExpressions": [{
                "key": "app",
                "operator": "In",
                "values": ["nginx"]
              }]
            },
            "topologyKey": "kubernetes.io/hostname"
          }
        }]
      }
    }
  }
]'
```

**Issue: High memory usage or OOMKilled**

```bash
# Check resource usage
kubectl top pods -l app=nginx

# Check for OOMKilled Pods
kubectl get pods -l app=nginx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}{end}'

# Check resource limits
kubectl get deployment nginx-deployment -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Solution: Increase memory limits
kubectl set resources deployment nginx-deployment -c=nginx --limits=memory=512Mi

# Or optimize application memory usage
```

**Issue: Deployment update causing downtime**

```bash
# Check update strategy
kubectl get deployment nginx-deployment -o jsonpath='{.spec.strategy}'

# If Recreate, change to RollingUpdate
kubectl patch deployment nginx-deployment -p '{"spec":{"strategy":{"type":"RollingUpdate"}}}'

# Configure maxUnavailable and maxSurge
kubectl patch deployment nginx-deployment -p '{
  "spec": {
    "strategy": {
      "rollingUpdate": {
        "maxSurge": 1,
        "maxUnavailable": 0
      }
    }
  }
}'

# Ensure readiness probes are configured
kubectl get deployment nginx-deployment -o yaml | grep -A 10 "readinessProbe"
```

### Interview Notes

**Q1: What is the difference between a Deployment and a ReplicaSet?**

A: A ReplicaSet ensures a specified number of Pod replicas are running at any time, but it doesn't provide update or rollback capabilities. A Deployment is a higher-level abstraction that manages ReplicaSets and provides declarative updates, rolling updates, rollbacks, and version history. In practice, you should always use Deployments instead of directly creating ReplicaSets.

**Q2: How does a rolling update work in Kubernetes?**

A: During a rolling update:
1. Deployment creates a new ReplicaSet with the updated Pod template
2. New ReplicaSet is scaled up gradually (controlled by maxSurge)
3. Old ReplicaSet is scaled down gradually (controlled by maxUnavailable)
4. New Pods must pass readiness probes before old Pods are terminated
5. Process continues until all Pods are updated
6. Old ReplicaSet is retained for rollback (controlled by revisionHistoryLimit)
This ensures zero-downtime updates by always maintaining minimum available Pods.

**Q3: What is the purpose of maxSurge and maxUnavailable in Deployment strategy?**

A: 
- **maxSurge**: Maximum number of Pods that can exist above the desired replica count during an update. For example, with replicas=10 and maxSurge=2, up to 12 Pods can exist during the update. This allows faster updates but uses more resources temporarily.
- **maxUnavailable**: Maximum number of Pods that can be unavailable during an update. For example, with replicas=10 and maxUnavailable=1, at least 9 Pods must be available at all times. This controls the update speed and ensures service availability.
Both can be specified as absolute numbers or percentages.

**Q4: How do you rollback a Deployment to a previous version?**

A: Use `kubectl rollout undo deployment/<name>` to rollback to the previous version, or `kubectl rollout undo deployment/<name> --to-revision=<number>` to rollback to a specific revision. Kubernetes maintains a history of ReplicaSets (controlled by revisionHistoryLimit) that allows rollbacks. You can view the history with `kubectl rollout history deployment/<name>`. The rollback process is essentially a reverse rolling update, scaling up the old ReplicaSet and scaling down the current one.

---

## 5. ReplicaSets

### Concept Explanation (IN DETAIL)

**What is a ReplicaSet?**

A ReplicaSet is a Kubernetes controller that ensures a specified number of Pod replicas are running at any given time. It's the next-generation replacement for ReplicationControllers, providing more expressive Pod selectors. ReplicaSets are typically managed by Deployments and are rarely created directly by users.

**Why does it exist?**

ReplicaSets exist to provide high availability and scalability for applications. They solve the problem of maintaining a stable set of replica Pods running at any given time. If a Pod fails, crashes, or is deleted, the ReplicaSet automatically creates a replacement to maintain the desired count.

**What problem does it solve?**

ReplicaSets solve several critical problems:

1. **High Availability**: Ensures desired number of Pods are always running
2. **Self-Healing**: Automatically replaces failed Pods
3. **Horizontal Scaling**: Easily adjust number of replicas
4. **Load Distribution**: Spreads Pods across nodes for better resource utilization
5. **Fault Tolerance**: Maintains service availability even when Pods or nodes fail

**How it works internally?**

ReplicaSets work through a control loop:

1. **Watch**: ReplicaSet controller continuously watches for ReplicaSet objects and their Pods
2. **Compare**: Compares actual number of running Pods with desired replicas
3. **Reconcile**: Takes action to match actual state with desired state:
   - If fewer Pods than desired: Creates new Pods
   - If more Pods than desired: Deletes excess Pods
4. **Repeat**: Continuously monitors and adjusts

The controller uses label selectors to identify which Pods belong to the ReplicaSet. It doesn't care about the Pod's state or health—it only ensures the count matches the desired replicas.

### Architecture / Internal Working

**Step-by-step flow:**

**1. ReplicaSet Creation:**

```
User creates ReplicaSet
    ↓
API Server validates and stores in etcd
    ↓
ReplicaSet Controller watches for new ReplicaSets
    ↓
Controller compares current Pods with desired replicas
    ↓
Creates Pods to match desired count
    ↓
Scheduler assigns Pods to nodes
    ↓
Kubelet starts containers
```

**2. Pod Failure Scenario:**

```
Pod crashes or is deleted
    ↓
ReplicaSet Controller detects Pod count < desired replicas
    ↓
Creates replacement Pod
    ↓
Scheduler assigns to node
    ↓
Kubelet starts container
    ↓
Desired state restored
```

**3. Scaling Scenario:**

```
User updates replicas count
    ↓
ReplicaSet Controller detects change
    ↓
If scaling up: Creates new Pods
If scaling down: Deletes excess Pods (oldest first)
    ↓
Continues until actual count matches desired
```

**4. Label Selector Matching:**

ReplicaSets use label selectors to identify Pods:
- **matchLabels**: Simple equality-based matching
- **matchExpressions**: More complex set-based matching

The controller continuously queries for Pods matching the selector and adjusts the count.

**Components Involved:**

- **ReplicaSet Controller**: Manages ReplicaSet lifecycle and Pod count
- **API Server**: Stores ReplicaSet state in etcd
- **Scheduler**: Assigns new Pods to nodes
- **Kubelet**: Manages Pod lifecycle on nodes

**Relationship with Deployments:**

```
Deployment
    ↓ (manages)
ReplicaSet (current version)
    ↓ (manages)
Pods (current version)

ReplicaSet (previous version - retained for rollback)
    ↓ (manages)
Pods (scaled to 0)
```

### YAML Definition (MANDATORY)

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-replicaset
  namespace: default
  labels:
    app: nginx
    tier: frontend
spec:
  # Desired number of replicas
  replicas: 3
  
  # Selector to identify Pods managed by this ReplicaSet
  selector:
    # Simple equality-based matching
    matchLabels:
      app: nginx
      tier: frontend
    
    # Advanced set-based matching (optional)
    matchExpressions:
    - key: environment
      operator: In  # In, NotIn, Exists, DoesNotExist
      values:
      - production
      - staging
    - key: version
      operator: Exists
  
  # Pod template (same as Pod spec)
  template:
    metadata:
      labels:
        app: nginx
        tier: frontend
        environment: production
        version: "1.21.6"
    spec:
      containers:
      - name: nginx
        image: nginx:1.21.6
        ports:
        - containerPort: 80
          name: http
        
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        
        env:
        - name: ENVIRONMENT
          value: "production"
        
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
      
      # Scheduling constraints
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: nginx
              topologyKey: kubernetes.io/hostname
      
      restartPolicy: Always
```

**Field Explanations:**

- **replicas**: Desired number of Pod replicas
- **selector**: Labels used to identify Pods managed by this ReplicaSet
  - **matchLabels**: Simple key-value matching (AND logic)
  - **matchExpressions**: Advanced matching with operators
- **template**: Pod template specification (must match selector labels)
- **template.metadata.labels**: Labels applied to Pods (must include selector labels)

**Important Notes:**

1. **Immutable Selector**: Once created, the selector cannot be changed
2. **Label Matching**: Pod template labels must match the selector
3. **Orphan Pods**: Pods with matching labels but not created by the ReplicaSet are adopted
4. **Deletion**: Deleting a ReplicaSet deletes all its Pods (unless --cascade=orphan)

### kubectl Commands

**Creation:**

```bash
# Create ReplicaSet from YAML
kubectl apply -f replicaset.yaml

# Create ReplicaSet imperatively (not recommended)
kubectl create -f replicaset.yaml

# Dry run
kubectl apply -f replicaset.yaml --dry-run=client
```

**Verification:**

```bash
# List all ReplicaSets
kubectl get replicasets
kubectl get rs  # Short form

# Get ReplicaSet details
kubectl describe replicaset nginx-replicaset

# Get ReplicaSet with Pods
kubectl get rs,pods -l app=nginx

# Get ReplicaSet YAML
kubectl get rs nginx-replicaset -o yaml

# Get ReplicaSet status
kubectl get rs nginx-replicaset -o jsonpath='{.status.replicas}'

# Watch ReplicaSet status
kubectl get rs nginx-replicaset -w

# Get ReplicaSet events
kubectl get events --field-selector involvedObject.name=nginx-replicaset
```

**Scaling:**

```bash
# Scale ReplicaSet
kubectl scale replicaset nginx-replicaset --replicas=5

# Scale with current replicas check (only if current is 3)
kubectl scale replicaset nginx-replicaset --current-replicas=3 --replicas=5

# Verify scaling
kubectl get rs nginx-replicaset
kubectl get pods -l app=nginx
```

**Debugging:**

```bash
# Check if Pods are managed by ReplicaSet
kubectl get pods -l app=nginx -o jsonpath='{.items[*].metadata.ownerReferences[*].name}'

# Check ReplicaSet conditions
kubectl describe rs nginx-replicaset | grep -A 10 "Conditions"

# Get Pod distribution across nodes
kubectl get pods -l app=nginx -o wide

# Check why Pods are pending
kubectl describe pod <pod-name>

# Get ReplicaSet logs (from all Pods)
kubectl logs -l app=nginx --all-containers=true

# Execute command in ReplicaSet Pods
kubectl exec -it <pod-name> -- /bin/bash
```

**Cleanup:**

```bash
# Delete ReplicaSet (also deletes Pods)
kubectl delete replicaset nginx-replicaset

# Delete from file
kubectl delete -f replicaset.yaml

# Delete ReplicaSet but keep Pods (orphan)
kubectl delete replicaset nginx-replicaset --cascade=orphan

# Force delete
kubectl delete replicaset nginx-replicaset --force --grace-period=0

# Delete all ReplicaSets with label
kubectl delete rs -l app=nginx
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Selector Mismatch**
   - Pod template labels don't match selector
   - Result: ReplicaSet can't create Pods, validation error

2. **Directly Creating ReplicaSets**
   - Creating ReplicaSets instead of Deployments
   - Result: No update or rollback capabilities

3. **Changing Selector**
   - Attempting to modify selector after creation
   - Result: Immutable field error

4. **Orphan Pods**
   - Manually creating Pods with matching labels
   - Result: ReplicaSet adopts them, may delete to maintain count

5. **Resource Constraints**
   - Insufficient cluster resources for desired replicas
   - Result: Some Pods stuck in Pending state

**Troubleshooting Guide:**

**Issue: ReplicaSet not creating Pods**

```bash
# Check ReplicaSet status
kubectl describe rs nginx-replicaset

# Common causes:
# 1. Selector mismatch
kubectl get rs nginx-replicaset -o yaml | grep -A 10 "selector"
kubectl get rs nginx-replicaset -o yaml | grep -A 5 "labels"

# Verify template labels include all selector labels

# 2. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# 3. Image pull errors
kubectl get pods -l app=nginx
kubectl describe pod <pod-name>

# Solution: Fix selector, add resources, or fix image
```

**Issue: More Pods than desired replicas**

```bash
# Check current replica count
kubectl get rs nginx-replicaset

# Check if there are orphan Pods with matching labels
kubectl get pods -l app=nginx --show-labels

# ReplicaSet adopts Pods with matching labels
# Solution: Remove extra labels from orphan Pods or delete them
kubectl label pod <pod-name> app-
```

**Issue: Pods not evenly distributed**

```bash
# Check Pod distribution
kubectl get pods -l app=nginx -o wide

# Check if pod anti-affinity is configured
kubectl get rs nginx-replicaset -o yaml | grep -A 20 "affinity"

# Solution: Add pod anti-affinity to template
kubectl patch rs nginx-replicaset --type=json -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/affinity",
    "value": {
      "podAntiAffinity": {
        "preferredDuringSchedulingIgnoredDuringExecution": [{
          "weight": 100,
          "podAffinityTerm": {
            "labelSelector": {
              "matchLabels": {"app": "nginx"}
            },
            "topologyKey": "kubernetes.io/hostname"
          }
        }]
      }
    }
  }
]'

# Note: Existing Pods won't be affected, only new Pods
```

**Issue: Cannot delete ReplicaSet**

```bash
# Check if ReplicaSet is stuck in terminating
kubectl get rs nginx-replicaset

# Check for finalizers
kubectl get rs nginx-replicaset -o yaml | grep finalizers

# Force delete if necessary
kubectl delete rs nginx-replicaset --force --grace-period=0

# If still stuck, remove finalizers
kubectl patch rs nginx-replicaset -p '{"metadata":{"finalizers":[]}}' --type=merge
```

**Issue: ReplicaSet not scaling down**

```bash
# Check current replicas
kubectl get rs nginx-replicaset

# Verify desired replicas
kubectl get rs nginx-replicaset -o jsonpath='{.spec.replicas}'

# Check if Pods are stuck in terminating
kubectl get pods -l app=nginx

# Check for PodDisruptionBudget
kubectl get pdb

# If PDB is blocking, check its status
kubectl describe pdb <pdb-name>

# Solution: Adjust PDB or wait for grace period
```

### Interview Notes

**Q1: What is the difference between a ReplicaSet and a ReplicationController?**

A: ReplicaSet is the next-generation replacement for ReplicationController. The main differences are:
- **Selector**: ReplicaSet supports set-based label selectors (In, NotIn, Exists, DoesNotExist) while ReplicationController only supports equality-based selectors (=, ==, !=)
- **API Version**: ReplicaSet is in apps/v1, ReplicationController is in v1
- **Usage**: ReplicaSets are used by Deployments, while ReplicationControllers are legacy
In practice, you should always use Deployments (which manage ReplicaSets) instead of directly creating ReplicaSets or ReplicationControllers.

**Q2: Why should you use Deployments instead of ReplicaSets?**

A: While ReplicaSets ensure a specified number of Pods are running, they don't provide update or rollback capabilities. Deployments manage ReplicaSets and provide:
- Declarative updates with rolling update strategy
- Rollback to previous versions
- Pause and resume updates
- Version history
- Update progress tracking
ReplicaSets are the underlying mechanism, but Deployments provide the user-friendly interface and additional features needed for production workloads.

**Q3: How does a ReplicaSet identify which Pods it manages?**

A: ReplicaSets use label selectors to identify Pods. The selector can use:
- **matchLabels**: Simple equality-based matching (all labels must match)
- **matchExpressions**: Advanced set-based matching with operators (In, NotIn, Exists, DoesNotExist)
The ReplicaSet controller continuously queries for Pods matching the selector and ensures the count matches the desired replicas. It will adopt existing Pods with matching labels and create new Pods if needed.

**Q4: What happens when you delete a ReplicaSet?**

A: By default, deleting a ReplicaSet also deletes all Pods it manages (cascade delete). However, you can use `--cascade=orphan` to delete only the ReplicaSet while keeping the Pods running. The orphaned Pods will continue running but won't be managed by any controller until adopted by another ReplicaSet or deleted manually. This is useful when you want to replace a ReplicaSet without disrupting running Pods.

# Kubernetes Complete Deep Dive Guide - Part 2

**Topics 6-22: Advanced Kubernetes Concepts**

---

## 6. Pod Lifecycle & Scheduling

![Pod Lifecycle](https://mgx-backend-cdn.metadl.com/generate/images/924069/2026-01-21/f3942cff-ce5c-4e08-9d10-2d95fa8b5300.png)

![Pod Scheduling](https://mgx-backend-cdn.metadl.com/generate/images/924069/2026-01-21/c1eccb0a-7420-4896-9ba4-1c5520cbd337.png)

### Concept Explanation (IN DETAIL)

**What is Pod Lifecycle?**

Pod lifecycle refers to the sequence of phases a Pod goes through from creation to termination. Understanding the lifecycle is crucial for debugging, monitoring, and ensuring application reliability. Each phase represents a distinct state in the Pod's existence, and transitions between phases are triggered by specific events or conditions.

**What is Pod Scheduling?**

Pod scheduling is the process by which Kubernetes determines which node should run a Pod. The Scheduler is responsible for this decision, considering factors like resource availability, constraints, affinity rules, taints, and tolerations. Scheduling is a critical component that affects application performance, reliability, and resource utilization.

**Why do they exist?**

Pod lifecycle and scheduling exist to:
1. Provide visibility into Pod state for monitoring and debugging
2. Enable automated responses to Pod failures
3. Optimize resource utilization across the cluster
4. Ensure Pods run on appropriate nodes based on requirements
5. Support advanced deployment patterns (blue-green, canary, etc.)
6. Handle node failures gracefully

**What problems do they solve?**

**Pod Lifecycle solves:**
1. **State Management**: Clear understanding of Pod status at any time
2. **Failure Detection**: Identify when Pods fail and why
3. **Automated Recovery**: Enable controllers to respond to state changes
4. **Resource Cleanup**: Proper termination and resource release
5. **Debugging**: Understand why Pods aren't running as expected

**Pod Scheduling solves:**
1. **Resource Optimization**: Place Pods where resources are available
2. **High Availability**: Spread Pods across nodes/zones for fault tolerance
3. **Performance**: Co-locate related Pods or separate conflicting ones
4. **Compliance**: Ensure Pods run on nodes meeting specific requirements
5. **Cost Efficiency**: Optimize node utilization to minimize waste

**How they work internally?**

**Pod Lifecycle Phases:**

1. **Pending**: Pod accepted but not yet running
   - Waiting for scheduling
   - Pulling container images
   - Waiting for resources

2. **Running**: Pod bound to node, at least one container running
   - All containers started successfully
   - Application is executing

3. **Succeeded**: All containers terminated successfully
   - Exit code 0
   - Will not restart (for Jobs/CronJobs)

4. **Failed**: All containers terminated, at least one failed
   - Non-zero exit code
   - May restart based on restartPolicy

5. **Unknown**: Pod state cannot be determined
   - Usually due to node communication failure

**Pod Scheduling Process:**

1. **Watch**: Scheduler watches for Pods with no nodeName
2. **Filter**: Eliminates nodes that don't meet requirements
3. **Score**: Ranks remaining nodes based on priorities
4. **Bind**: Assigns Pod to highest-scoring node
5. **Notify**: Updates Pod spec with nodeName

### Architecture / Internal Working

**Pod Lifecycle Flow:**

```
Pod Created (API Server)
    ↓
Pending Phase
    ↓
Scheduler assigns node
    ↓
Kubelet pulls images
    ↓
Init containers run (if defined)
    ↓
Main containers start
    ↓
Running Phase
    ↓
[Application executes]
    ↓
Termination signal received (SIGTERM)
    ↓
PreStop hooks execute
    ↓
Grace period begins (default 30s)
    ↓
Containers stop gracefully
    ↓
SIGKILL sent if still running after grace period
    ↓
Succeeded/Failed Phase
    ↓
Pod removed from API Server
```

**Detailed Phase Transitions:**

**1. Pending → Running:**
- Scheduler finds suitable node
- Kubelet receives Pod specification
- Container runtime pulls images
- Init containers run sequentially
- Main containers start in parallel
- Readiness probes begin checking
- Once ready, Pod enters Running phase

**2. Running → Succeeded/Failed:**
- Application completes execution
- Containers exit with exit codes
- Exit code 0 → Succeeded
- Non-zero exit code → Failed
- RestartPolicy determines next action

**3. Running → Unknown:**
- Node becomes unreachable
- Kubelet stops reporting status
- API Server marks Pod as Unknown
- After timeout, Pod may be evicted

**Pod Scheduling Flow:**

```
1. Pod Creation
   User creates Pod → API Server stores in etcd

2. Scheduler Watch
   Scheduler detects Pod with nodeName=""

3. Filtering Phase (Predicates)
   ├─ Sufficient CPU/Memory?
   ├─ Port conflicts?
   ├─ Volume availability?
   ├─ Node selector match?
   ├─ Affinity rules satisfied?
   ├─ Taints tolerated?
   └─ Custom predicates

4. Scoring Phase (Priorities)
   ├─ Resource balance
   ├─ Spread across nodes
   ├─ Affinity preferences
   ├─ Image locality
   └─ Custom priorities

5. Binding
   Scheduler updates Pod.spec.nodeName

6. Kubelet Execution
   Kubelet on assigned node starts Pod
```

**Scheduling Constraints:**

**Node Selector:**
- Simple key-value matching
- Hard constraint (must match)
- Example: `nodeSelector: {disktype: ssd}`

**Node Affinity:**
- More expressive than nodeSelector
- Supports operators (In, NotIn, Exists, DoesNotExist, Gt, Lt)
- Required vs Preferred rules
- Example: Prefer nodes in zone us-west-1a

**Pod Affinity/Anti-Affinity:**
- Schedule Pods relative to other Pods
- Co-locate related Pods (affinity)
- Spread Pods for HA (anti-affinity)
- Example: Don't schedule two replicas on same node

**Taints and Tolerations:**
- Taints repel Pods from nodes
- Tolerations allow Pods to schedule on tainted nodes
- Effects: NoSchedule, PreferNoSchedule, NoExecute
- Example: Dedicate nodes to specific workloads

**Components Involved:**

- **API Server**: Stores Pod state
- **Scheduler**: Assigns Pods to nodes
- **Kubelet**: Manages Pod lifecycle on nodes
- **Controller Manager**: Monitors and responds to state changes
- **Container Runtime**: Executes containers

### YAML Definition (MANDATORY)

**Pod with Lifecycle Hooks:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lifecycle-demo
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:1.21.6
    
    # Lifecycle hooks
    lifecycle:
      # Executed immediately after container creation
      postStart:
        exec:
          command: ["/bin/sh", "-c", "echo 'Container started at $(date)' >> /var/log/lifecycle.log"]
      
      # Executed before container termination
      preStop:
        exec:
          command: ["/bin/sh", "-c", "nginx -s quit; while killall -0 nginx 2>/dev/null; do sleep 1; done"]
    
    # Liveness probe - restart if fails
    livenessProbe:
      httpGet:
        path: /healthz
        port: 80
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      successThreshold: 1
      failureThreshold: 3
    
    # Readiness probe - remove from service if fails
    readinessProbe:
      httpGet:
        path: /ready
        port: 80
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      successThreshold: 1
      failureThreshold: 3
    
    # Startup probe - for slow-starting containers
    startupProbe:
      httpGet:
        path: /startup
        port: 80
      initialDelaySeconds: 0
      periodSeconds: 10
      timeoutSeconds: 3
      successThreshold: 1
      failureThreshold: 30  # 30 * 10s = 5 minutes to start
  
  # Restart policy
  restartPolicy: Always  # Always, OnFailure, Never
  
  # Termination grace period
  terminationGracePeriodSeconds: 30
```

**Pod with Scheduling Constraints:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: scheduling-demo
  namespace: default
spec:
  # Simple node selector
  nodeSelector:
    disktype: ssd
    environment: production
  
  # Node affinity (more expressive)
  affinity:
    nodeAffinity:
      # Required: Pod will not schedule unless rule is met
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/hostname
            operator: In
            values:
            - node1
            - node2
          - key: node-role.kubernetes.io/worker
            operator: Exists
      
      # Preferred: Scheduler tries to satisfy but not required
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-west-1a
      - weight: 50
        preference:
          matchExpressions:
          - key: node.kubernetes.io/instance-type
            operator: In
            values:
            - m5.large
            - m5.xlarge
    
    # Pod affinity - schedule near other Pods
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - cache
        topologyKey: kubernetes.io/hostname
    
    # Pod anti-affinity - schedule away from other Pods
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app
              operator: In
              values:
              - web
          topologyKey: kubernetes.io/hostname
  
  # Tolerations - allow scheduling on tainted nodes
  tolerations:
  - key: "dedicated"
    operator: "Equal"
    value: "database"
    effect: "NoSchedule"
  - key: "node.kubernetes.io/not-ready"
    operator: "Exists"
    effect: "NoExecute"
    tolerationSeconds: 300
  
  # Priority class
  priorityClassName: high-priority
  
  containers:
  - name: nginx
    image: nginx:1.21.6
```

**PriorityClass Definition:**

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000  # Higher value = higher priority
globalDefault: false
description: "High priority for critical applications"
```

**Field Explanations:**

**Lifecycle:**
- **postStart**: Executed immediately after container creation (not guaranteed to run before ENTRYPOINT)
- **preStop**: Executed before container termination (blocking, must complete before SIGTERM)

**Probes:**
- **livenessProbe**: Determines if container is alive; restarts if fails
- **readinessProbe**: Determines if container is ready to serve traffic; removes from endpoints if fails
- **startupProbe**: Protects slow-starting containers; disables liveness/readiness until succeeds
- **initialDelaySeconds**: Wait before first probe
- **periodSeconds**: How often to probe
- **timeoutSeconds**: Probe timeout
- **successThreshold**: Consecutive successes needed to mark as successful
- **failureThreshold**: Consecutive failures needed to mark as failed

**Scheduling:**
- **nodeSelector**: Simple key-value node selection
- **nodeAffinity**: Advanced node selection with operators
- **podAffinity**: Schedule near Pods with matching labels
- **podAntiAffinity**: Schedule away from Pods with matching labels
- **tolerations**: Allow scheduling on tainted nodes
- **priorityClassName**: Determines scheduling priority

### kubectl Commands

**Lifecycle Management:**

```bash
# Get Pod phase
kubectl get pod <pod-name> -o jsonpath='{.status.phase}'

# Get detailed Pod status
kubectl describe pod <pod-name>

# Get Pod conditions
kubectl get pod <pod-name> -o jsonpath='{.status.conditions[*].type}'

# Get container states
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].state}'

# Get Pod events
kubectl get events --field-selector involvedObject.name=<pod-name> --sort-by='.lastTimestamp'

# Watch Pod status changes
kubectl get pod <pod-name> -w

# Get Pod restart count
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].restartCount}'

# Get Pod start time
kubectl get pod <pod-name> -o jsonpath='{.status.startTime}'

# Check if Pod is ready
kubectl get pod <pod-name> -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

**Scheduling Verification:**

```bash
# Get Pod's assigned node
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeName}'

# Get Pod's node selector
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeSelector}'

# Get Pod's affinity rules
kubectl get pod <pod-name> -o jsonpath='{.spec.affinity}'

# Get Pod's tolerations
kubectl get pod <pod-name> -o jsonpath='{.spec.tolerations}'

# Get Pod's priority
kubectl get pod <pod-name> -o jsonpath='{.spec.priority}'

# List Pods by node
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=<node-name>

# Get scheduling events
kubectl get events --field-selector involvedObject.name=<pod-name>,reason=Scheduled

# Check why Pod is pending
kubectl describe pod <pod-name> | grep -A 10 "Events"
```

**Node Operations:**

```bash
# List all nodes with labels
kubectl get nodes --show-labels

# Label a node
kubectl label nodes <node-name> disktype=ssd

# Remove label from node
kubectl label nodes <node-name> disktype-

# Taint a node
kubectl taint nodes <node-name> dedicated=database:NoSchedule

# Remove taint
kubectl taint nodes <node-name> dedicated:NoSchedule-

# Cordon node (prevent new Pods)
kubectl cordon <node-name>

# Uncordon node
kubectl uncordon <node-name>

# Drain node (evict Pods)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Get node capacity
kubectl describe node <node-name> | grep -A 5 "Capacity"

# Get node allocatable resources
kubectl describe node <node-name> | grep -A 5 "Allocatable"
```

**Debugging Scheduling:**

```bash
# Check scheduler logs
kubectl logs -n kube-system -l component=kube-scheduler

# Get scheduler events
kubectl get events -n kube-system --field-selector involvedObject.name=kube-scheduler

# Manually schedule a Pod (bypass scheduler)
kubectl patch pod <pod-name> -p '{"spec":{"nodeName":"<node-name>"}}'

# Get Pods that are pending
kubectl get pods --all-namespaces --field-selector status.phase=Pending

# Check resource availability on nodes
kubectl top nodes

# Get detailed node information
kubectl describe node <node-name>
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Incorrect Probe Configuration**
   - initialDelaySeconds too short (app not ready)
   - Timeout too short (false failures)
   - Probe endpoint doesn't exist
   - Result: Constant restarts or Pod never ready

2. **PreStop Hook Issues**
   - Hook takes longer than terminationGracePeriodSeconds
   - Hook fails silently
   - Result: Ungraceful shutdown, data loss

3. **Scheduling Constraint Conflicts**
   - Required affinity rules that can't be satisfied
   - Node selector matching no nodes
   - Insufficient resources on matching nodes
   - Result: Pods stuck in Pending

4. **Taint/Toleration Mismatches**
   - Missing tolerations for tainted nodes
   - Incorrect toleration key or value
   - Result: Pods not scheduling

5. **Priority Preemption Issues**
   - Not understanding preemption behavior
   - Critical Pods evicting important workloads
   - Result: Unexpected Pod evictions

**Troubleshooting Guide:**

**Issue: Pod stuck in Pending**

```bash
# Check Pod events
kubectl describe pod <pod-name>

# Common causes:

# 1. Insufficient resources
kubectl describe nodes | grep -A 5 "Allocated resources"
# Solution: Add nodes or reduce resource requests

# 2. Node selector mismatch
kubectl get pod <pod-name> -o jsonpath='{.spec.nodeSelector}'
kubectl get nodes --show-labels
# Solution: Fix selector or label nodes

# 3. Unbound PersistentVolumeClaim
kubectl get pvc
# Solution: Create PV or enable dynamic provisioning

# 4. Image pull errors
kubectl describe pod <pod-name> | grep -i "image"
# Solution: Fix image name or add imagePullSecrets

# 5. Affinity rules can't be satisfied
kubectl get pod <pod-name> -o yaml | grep -A 20 "affinity"
# Solution: Relax affinity rules or add matching Pods/nodes
```

**Issue: Pod in CrashLoopBackOff**

```bash
# Check container logs
kubectl logs <pod-name>
kubectl logs <pod-name> --previous

# Check restart count
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].restartCount}'

# Common causes:

# 1. Application error
# Solution: Fix application code

# 2. Liveness probe failing too early
kubectl describe pod <pod-name> | grep -A 10 "Liveness"
# Solution: Increase initialDelaySeconds

# 3. Missing dependencies
# Solution: Add init containers or fix startup order

# 4. Resource limits too low
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].resources}'
# Solution: Increase limits or optimize application
```

**Issue: Pod not ready (0/1 Ready)**

```bash
# Check readiness probe
kubectl describe pod <pod-name> | grep -A 10 "Readiness"

# Check container logs
kubectl logs <pod-name>

# Common causes:

# 1. Readiness probe endpoint not responding
# Solution: Fix application or probe configuration

# 2. Application still starting
# Solution: Increase initialDelaySeconds or add startupProbe

# 3. Dependencies not available
# Solution: Ensure dependent services are running

# Test readiness endpoint manually
kubectl exec <pod-name> -- curl -f http://localhost:80/ready
```

**Issue: Pod terminated unexpectedly**

```bash
# Check Pod status
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].state}'

# Check termination reason
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].lastState.terminated.reason}'

# Common reasons:

# 1. OOMKilled (Out of Memory)
kubectl describe pod <pod-name> | grep -i "oom"
# Solution: Increase memory limits

# 2. Error (non-zero exit code)
kubectl logs <pod-name> --previous
# Solution: Fix application error

# 3. Evicted (node pressure)
kubectl describe pod <pod-name> | grep -i "evicted"
# Solution: Add resources or adjust resource requests

# 4. Preempted (higher priority Pod needed resources)
kubectl get events --field-selector involvedObject.name=<pod-name>,reason=Preempted
# Solution: Adjust priority classes
```

**Issue: Scheduling delays**

```bash
# Check scheduler performance
kubectl logs -n kube-system -l component=kube-scheduler | grep "Attempting to schedule"

# Check pending Pods
kubectl get pods --all-namespaces --field-selector status.phase=Pending

# Common causes:

# 1. Too many Pods to schedule
# Solution: Scale scheduler or optimize cluster

# 2. Complex affinity rules
# Solution: Simplify rules or use preferred instead of required

# 3. Resource fragmentation
kubectl describe nodes | grep -A 5 "Allocated resources"
# Solution: Consolidate workloads or add nodes

# 4. Scheduler not running
kubectl get pods -n kube-system -l component=kube-scheduler
# Solution: Restart scheduler
```

### Interview Notes

**Q1: What are the five phases of a Pod's lifecycle?**

A: The five phases are:
1. **Pending**: Pod accepted but not yet running (scheduling, image pulling, resource allocation)
2. **Running**: Pod bound to node with at least one container running
3. **Succeeded**: All containers terminated successfully with exit code 0
4. **Failed**: All containers terminated with at least one failure (non-zero exit code)
5. **Unknown**: Pod state cannot be determined (usually due to node communication failure)

**Q2: What is the difference between liveness, readiness, and startup probes?**

A:
- **Liveness Probe**: Checks if the container is alive. If it fails, kubelet restarts the container. Used to detect deadlocks or hung processes.
- **Readiness Probe**: Checks if the container is ready to serve traffic. If it fails, the Pod is removed from service endpoints but not restarted. Used to control when traffic should be sent to the Pod.
- **Startup Probe**: Protects slow-starting containers. Disables liveness and readiness probes until it succeeds. Used for applications with long initialization times.

**Q3: How does the Kubernetes scheduler decide which node to place a Pod on?**

A: The scheduler uses a two-phase process:
1. **Filtering (Predicates)**: Eliminates nodes that don't meet requirements (insufficient resources, port conflicts, volume availability, node selectors, affinity rules, taints)
2. **Scoring (Priorities)**: Ranks remaining nodes based on factors (resource balance, spreading, affinity preferences, image locality)
The Pod is assigned to the highest-scoring node. If no nodes pass filtering, the Pod remains Pending.

**Q4: What is the difference between required and preferred affinity rules?**

A:
- **Required (requiredDuringSchedulingIgnoredDuringExecution)**: Hard constraint. The Pod will not schedule unless the rule is satisfied. If no nodes match, the Pod stays Pending.
- **Preferred (preferredDuringSchedulingIgnoredDuringExecution)**: Soft constraint. The scheduler tries to satisfy the rule but will still schedule the Pod if it can't. Each rule has a weight (1-100) indicating its importance.
Both types are "IgnoredDuringExecution", meaning they don't affect already-running Pods if conditions change.

---

## 7. Labels & Selectors

![Labels and Selectors](https://mgx-backend-cdn.metadl.com/generate/images/924069/2026-01-21/bc9fa81a-c9e2-46f6-84b5-a52ea68b1372.png)

### Concept Explanation (IN DETAIL)

**What are Labels?**

Labels are key-value pairs attached to Kubernetes objects (Pods, Services, Deployments, etc.). They are used to organize and select subsets of objects. Labels are intended to be meaningful and relevant to users but don't directly imply semantics to the core system. You can attach multiple labels to an object, and each label key must be unique for a given object.

**What are Selectors?**

Selectors are expressions used to filter Kubernetes objects based on their labels. There are two types of selectors: equality-based (=, ==, !=) and set-based (in, notin, exists). Selectors are used by Services to identify backend Pods, by Deployments to manage ReplicaSets, and by many other controllers to identify the objects they manage.

**Why do they exist?**

Labels and selectors exist to provide a flexible, loosely-coupled mechanism for organizing and querying Kubernetes objects. Unlike names and UIDs (which are unique identifiers), labels allow you to:
1. Group objects in meaningful ways (by application, tier, environment, version, etc.)
2. Select subsets of objects for operations
3. Enable controllers to manage related objects
4. Support multi-dimensional organization (objects can have multiple labels)

**What problems do they solve?**

Labels and selectors solve several critical problems:

1. **Organization**: Group related objects across different resource types
2. **Selection**: Query and operate on subsets of objects
3. **Service Discovery**: Services use selectors to find backend Pods
4. **Controller Management**: Deployments, ReplicaSets use selectors to manage Pods
5. **Operational Flexibility**: Change object groupings without modifying object definitions
6. **Multi-tenancy**: Separate resources by team, environment, or customer
7. **Monitoring & Logging**: Aggregate metrics and logs by label

**How they work internally?**

Labels are stored as part of an object's metadata in etcd. When you query objects using selectors, the API Server performs a label matching operation:

1. **Label Storage**: Labels stored in `metadata.labels` as a map
2. **Selector Query**: Client sends selector expression to API Server
3. **Matching**: API Server filters objects based on selector
4. **Response**: Returns matching objects

Controllers continuously watch for objects matching their selectors and take action when objects are added, modified, or deleted.

### Architecture / Internal Working

**Label Structure:**

```
metadata:
  labels:
    key1: value1
    key2: value2
    key3: value3
```

**Label Key Format:**
- Optional prefix: `example.com/`
- Name: `role`
- Full key: `example.com/role`

**Constraints:**
- Prefix (optional): DNS subdomain, max 253 characters
- Name: Max 63 characters, alphanumeric, `-`, `_`, `.`
- Value: Max 63 characters, alphanumeric, `-`, `_`, `.`

**Selector Types:**

**1. Equality-Based Selectors:**

```yaml
# Single label
selector:
  app: nginx

# Multiple labels (AND logic)
selector:
  app: nginx
  tier: frontend
  environment: production
```

**2. Set-Based Selectors:**

```yaml
selector:
  matchLabels:
    app: nginx
  matchExpressions:
  - key: environment
    operator: In
    values:
    - production
    - staging
  - key: tier
    operator: NotIn
    values:
    - backend
  - key: version
    operator: Exists
  - key: deprecated
    operator: DoesNotExist
```

**Operators:**
- **In**: Label value must be in the set
- **NotIn**: Label value must not be in the set
- **Exists**: Label key must exist (value doesn't matter)
- **DoesNotExist**: Label key must not exist

**Label Propagation:**

```
Deployment (labels: app=nginx, version=v1)
    ↓ (propagates labels)
ReplicaSet (labels: app=nginx, version=v1, pod-template-hash=abc123)
    ↓ (propagates labels)
Pods (labels: app=nginx, version=v1, pod-template-hash=abc123)
```

**Service Selection:**

```
Service (selector: app=nginx, tier=frontend)
    ↓ (selects Pods)
Endpoints (Pod IPs with matching labels)
    ↓ (traffic routing)
Pods (app=nginx, tier=frontend)
```

**Common Label Patterns:**

**Application Labels:**
- `app`: Application name
- `version`: Application version
- `component`: Component within application (frontend, backend, database)
- `part-of`: Larger application or system

**Operational Labels:**
- `environment`: Environment (production, staging, development)
- `tier`: Architecture tier (frontend, backend, cache)
- `track`: Release track (stable, canary, beta)

**Management Labels:**
- `managed-by`: Tool managing the resource (helm, kubectl)
- `owner`: Team or person responsible
- `cost-center`: For cost allocation

**Components Involved:**

- **API Server**: Stores labels and processes selector queries
- **etcd**: Persists label data
- **Controllers**: Use selectors to identify managed objects
- **Services**: Use selectors to identify backend Pods
- **kubectl**: Provides label filtering and manipulation

### YAML Definition (MANDATORY)

**Pod with Labels:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  namespace: default
  labels:
    # Application identification
    app: nginx
    app.kubernetes.io/name: nginx
    app.kubernetes.io/instance: nginx-prod
    app.kubernetes.io/version: "1.21.6"
    app.kubernetes.io/component: webserver
    app.kubernetes.io/part-of: ecommerce-platform
    app.kubernetes.io/managed-by: helm
    
    # Operational labels
    environment: production
    tier: frontend
    track: stable
    
    # Management labels
    owner: platform-team
    cost-center: engineering
    
    # Custom labels
    region: us-west-1
    datacenter: dc1
spec:
  containers:
  - name: nginx
    image: nginx:1.21.6
```

**Service with Selector:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: default
  labels:
    app: nginx
    tier: frontend
spec:
  # Equality-based selector
  selector:
    app: nginx
    tier: frontend
    environment: production
  
  ports:
  - port: 80
    targetPort: 8080
```

**Deployment with Set-Based Selector:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
  labels:
    app: nginx
    version: v1
spec:
  replicas: 3
  
  # Set-based selector
  selector:
    matchLabels:
      app: nginx
    matchExpressions:
    - key: environment
      operator: In
      values:
      - production
      - staging
    - key: tier
      operator: NotIn
      values:
      - backend
    - key: version
      operator: Exists
  
  template:
    metadata:
      labels:
        app: nginx
        environment: production
        tier: frontend
        version: v1
    spec:
      containers:
      - name: nginx
        image: nginx:1.21.6
```

**NetworkPolicy with Label Selector:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-network-policy
  namespace: default
spec:
  # Apply to Pods with these labels
  podSelector:
    matchLabels:
      tier: frontend
  
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # Allow traffic from Pods with these labels
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 80
  
  egress:
  # Allow traffic to Pods with these labels
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 3306
```

**Field Explanations:**

- **metadata.labels**: Key-value pairs attached to the object
- **selector**: Filters objects based on labels
- **matchLabels**: Equality-based matching (all must match)
- **matchExpressions**: Set-based matching with operators
- **operator**: Matching operator (In, NotIn, Exists, DoesNotExist)
- **values**: List of values for In/NotIn operators

**Recommended Labels (Kubernetes Standard):**

```yaml
labels:
  app.kubernetes.io/name: mysql           # Application name
  app.kubernetes.io/instance: mysql-prod  # Unique instance identifier
  app.kubernetes.io/version: "5.7.21"     # Application version
  app.kubernetes.io/component: database   # Component within architecture
  app.kubernetes.io/part-of: wordpress    # Part of larger application
  app.kubernetes.io/managed-by: helm      # Tool managing the resource
```

### kubectl Commands

**Label Operations:**

```bash
# Add label to Pod
kubectl label pod <pod-name> environment=production

# Add multiple labels
kubectl label pod <pod-name> tier=frontend version=v1

# Update existing label (requires --overwrite)
kubectl label pod <pod-name> environment=staging --overwrite

# Remove label
kubectl label pod <pod-name> environment-

# Label all Pods in namespace
kubectl label pods --all environment=production

# Label nodes
kubectl label nodes <node-name> disktype=ssd

# Show labels
kubectl get pods --show-labels

# Show specific labels as columns
kubectl get pods -L app,environment,version
```

**Selector Queries:**

```bash
# Equality-based selector
kubectl get pods -l app=nginx
kubectl get pods -l app=nginx,tier=frontend
kubectl get pods -l 'app=nginx,environment=production'

# Inequality
kubectl get pods -l app!=nginx

# Set-based selector
kubectl get pods -l 'environment in (production,staging)'
kubectl get pods -l 'tier notin (backend)'
kubectl get pods -l 'version'          # Label exists
kubectl get pods -l '!version'         # Label doesn't exist

# Complex selectors
kubectl get pods -l 'app=nginx,environment in (production,staging),tier!=backend'

# Select across all namespaces
kubectl get pods --all-namespaces -l app=nginx

# Count Pods matching selector
kubectl get pods -l app=nginx --no-headers | wc -l
```

**Operations on Selected Objects:**

```bash
# Delete Pods with label
kubectl delete pods -l app=nginx

# Delete Pods with multiple labels
kubectl delete pods -l 'app=nginx,environment=staging'

# Scale Deployment by label
kubectl scale deployment -l app=nginx --replicas=5

# Get logs from Pods with label
kubectl logs -l app=nginx --all-containers=true

# Execute command in Pods with label
kubectl exec -l app=nginx -- ls /usr/share/nginx/html

# Port forward to Pod with label
kubectl port-forward -l app=nginx 8080:80

# Get resource usage for Pods with label
kubectl top pods -l app=nginx
```

**Label Management:**

```bash
# View label keys and values
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels}{"\n"}{end}'

# Get Pods with specific label value
kubectl get pods -o json | jq '.items[] | select(.metadata.labels.app=="nginx") | .metadata.name'

# List all unique label keys
kubectl get pods -o json | jq -r '.items[].metadata.labels | keys[]' | sort -u

# List all unique values for a label key
kubectl get pods -o json | jq -r '.items[].metadata.labels.environment' | sort -u

# Find Pods without a specific label
kubectl get pods -o json | jq -r '.items[] | select(.metadata.labels.environment == null) | .metadata.name'

# Batch label update
kubectl get pods -l app=nginx -o name | xargs -I {} kubectl label {} version=v2 --overwrite
```

**Debugging Selectors:**

```bash
# Check Service selector
kubectl get service <service-name> -o jsonpath='{.spec.selector}'

# Check which Pods match Service selector
kubectl get pods -l $(kubectl get service <service-name> -o jsonpath='{.spec.selector}' | sed 's/map\[//;s/\]//;s/ /,/g')

# Check Deployment selector
kubectl get deployment <deployment-name> -o jsonpath='{.spec.selector}'

# Verify Pod labels match Deployment selector
kubectl get pods -l app=nginx -o jsonpath='{.items[*].metadata.labels}'

# Check NetworkPolicy selectors
kubectl get networkpolicy <policy-name> -o yaml | grep -A 10 "podSelector"
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Selector Mismatch**
   - Service selector doesn't match Pod labels
   - Deployment selector doesn't match template labels
   - Result: No endpoints, Deployment can't manage Pods

2. **Label Syntax Errors**
   - Invalid characters in label keys or values
   - Label keys/values too long (>63 characters)
   - Result: API validation errors

3. **Immutable Selectors**
   - Trying to change Deployment/Service selector after creation
   - Result: Immutable field error

4. **Overwriting Important Labels**
   - Accidentally removing or changing critical labels
   - Result: Pods orphaned, Services lose endpoints

5. **Label Confusion**
   - Using labels for configuration data (should use annotations)
   - Too many labels (makes queries complex)
   - Result: Cluttered metadata, slow queries

**Troubleshooting Guide:**

**Issue: Service has no endpoints**

```bash
# Check Service selector
kubectl get service <service-name> -o jsonpath='{.spec.selector}'

# Check Pod labels
kubectl get pods --show-labels

# Verify labels match
# Service selector: app=nginx, tier=frontend
# Pod labels must include: app=nginx, tier=frontend

# If mismatch, update Pod labels
kubectl label pod <pod-name> tier=frontend

# Or update Service selector (requires recreation)
kubectl delete service <service-name>
kubectl create service clusterip <service-name> --tcp=80:8080 --selector=app=nginx
```

**Issue: Deployment not managing Pods**

```bash
# Check Deployment selector
kubectl get deployment <deployment-name> -o jsonpath='{.spec.selector}'

# Check Pod template labels
kubectl get deployment <deployment-name> -o jsonpath='{.spec.template.metadata.labels}'

# Template labels must include all selector labels
# If mismatch, you must recreate Deployment (selector is immutable)

# Save current spec
kubectl get deployment <deployment-name> -o yaml > deployment.yaml

# Edit selector and template labels
vi deployment.yaml

# Delete and recreate
kubectl delete deployment <deployment-name>
kubectl apply -f deployment.yaml
```

**Issue: Can't find Pods with selector**

```bash
# Test selector
kubectl get pods -l 'app=nginx,environment=production'

# If no results, check:
# 1. Label syntax
kubectl get pods --show-labels | grep nginx

# 2. Namespace
kubectl get pods -n <namespace> -l app=nginx

# 3. Label values (case-sensitive)
kubectl get pods -o jsonpath='{.items[*].metadata.labels.environment}'

# 4. Use broader selector
kubectl get pods -l app=nginx  # Remove environment filter
```

**Issue: Too many Pods match selector**

```bash
# Check which Pods match
kubectl get pods -l app=nginx --show-labels

# Refine selector to be more specific
kubectl get pods -l 'app=nginx,environment=production,version=v1'

# Or update Pod labels to differentiate
kubectl label pod <pod-name> version=v2 --overwrite
```

**Issue: Label operation fails**

```bash
# Check label syntax
# Valid: app=nginx, app.kubernetes.io/name=nginx
# Invalid: app name=nginx (space), app@kubernetes.io/name=nginx (@)

# Check label length
# Max 63 characters for name and value
# Max 253 characters for prefix

# For existing labels, use --overwrite
kubectl label pod <pod-name> environment=staging --overwrite

# Check if object exists
kubectl get pod <pod-name>

# Check permissions
kubectl auth can-i update pods
```

### Interview Notes

**Q1: What is the difference between labels and annotations?**

A:
- **Labels**: Used for identification and selection. Limited to 63 characters for keys and values. Used by selectors to query objects. Intended for meaningful, operational metadata (app name, version, environment).
- **Annotations**: Used for non-identifying metadata. No size limit (within reason). Cannot be used in selectors. Intended for descriptive, informational metadata (build info, contact details, documentation links).

Example:
```yaml
labels:
  app: nginx
  version: v1
annotations:
  description: "Production nginx web server"
  build-date: "2024-01-15"
  contact: "platform-team@example.com"
```

**Q2: What are the two types of label selectors and how do they differ?**

A:
- **Equality-Based**: Uses `=`, `==`, or `!=` operators. Simpler syntax. Used in Services and older resources. Example: `app=nginx,tier=frontend`
- **Set-Based**: Uses `in`, `notin`, `exists` operators. More expressive. Used in Deployments, ReplicaSets, and newer resources. Example: `environment in (production,staging), tier notin (backend)`

Set-based selectors are more powerful and flexible, allowing complex matching logic. Equality-based selectors are simpler but less expressive.

**Q3: Why are Deployment selectors immutable?**

A: Deployment selectors are immutable to prevent accidental orphaning of Pods. If you could change the selector, existing Pods might no longer match, causing the Deployment to lose control over them. This could lead to:
- Orphaned Pods that aren't managed by any controller
- Duplicate Pods if the Deployment creates new ones
- Confusion about which Pods belong to which Deployment

To change a selector, you must delete and recreate the Deployment, which forces you to acknowledge the impact of the change.

**Q4: What are some best practices for labeling Kubernetes objects?**

A:
1. **Use recommended labels**: Follow Kubernetes standard labels (app.kubernetes.io/name, app.kubernetes.io/version, etc.)
2. **Be consistent**: Use the same label keys across all objects
3. **Be specific**: Use multiple labels for precise selection (app, environment, version)
4. **Avoid overloading**: Don't use too many labels (makes queries complex)
5. **Use prefixes**: Use DNS prefixes for custom labels (mycompany.com/label)
6. **Document labels**: Maintain documentation of label meanings and usage
7. **Automate labeling**: Use tools like Helm to ensure consistent labeling
8. **Plan for selection**: Consider how you'll query objects when designing labels

---

## 8. ConfigMaps

![ConfigMap Flow](https://mgx-backend-cdn.metadl.com/generate/images/924069/2026-01-21/44bcdf78-3d54-4f42-a590-6b028b0e0693.png)

### Concept Explanation (IN DETAIL)

**What is a ConfigMap?**

A ConfigMap is a Kubernetes API object used to store non-confidential configuration data in key-value pairs. ConfigMaps allow you to decouple configuration artifacts from container images, making applications more portable and easier to configure. Pods can consume ConfigMaps as environment variables, command-line arguments, or configuration files in volumes.

**Why does it exist?**

ConfigMaps exist to solve the problem of configuration management in containerized environments. Without ConfigMaps, you would need to:
1. Bake configuration into container images (requires rebuild for config changes)
2. Use environment variables in Pod specs (not reusable, hard to manage)
3. Mount configuration from external systems (adds complexity and dependencies)

ConfigMaps provide a native, Kubernetes-integrated way to manage configuration separately from application code.

**What problems does it solve?**

ConfigMaps solve several critical problems:

1. **Configuration Decoupling**: Separate configuration from application code and images
2. **Reusability**: Share configuration across multiple Pods and applications
3. **Environment-Specific Config**: Different ConfigMaps for dev, staging, production
4. **Dynamic Updates**: Update configuration without rebuilding images
5. **Centralized Management**: Store all configuration in Kubernetes, not external systems
6. **Version Control**: Track configuration changes through Kubernetes API
7. **Namespace Isolation**: Separate configuration by namespace for multi-tenancy

**How it works internally?**

ConfigMaps store data as key-value pairs in etcd. When a Pod references a ConfigMap:

1. **Storage**: ConfigMap data stored in etcd as part of the ConfigMap object
2. **Reference**: Pod spec references ConfigMap by name
3. **Injection**: Kubelet retrieves ConfigMap data from API Server
4. **Mounting**: Data is injected as environment variables or mounted as files
5. **Updates**: Changes to ConfigMap are eventually reflected in mounted volumes (not env vars)

**ConfigMap Size Limit**: 1 MiB per ConfigMap (etcd limit)

### Architecture / Internal Working

**ConfigMap Creation Flow:**

```
User creates ConfigMap
    ↓
API Server validates data
    ↓
ConfigMap stored in etcd
    ↓
Available for Pod consumption
```

**Pod Consumption Flow:**

**As Environment Variables:**
```
Pod created with envFrom/env referencing ConfigMap
    ↓
Kubelet retrieves ConfigMap from API Server
    ↓
Environment variables set in container
    ↓
Container starts with env vars
```

**As Volume Mounts:**
```
Pod created with volume referencing ConfigMap
    ↓
Kubelet retrieves ConfigMap from API Server
    ↓
Creates temporary files with ConfigMap data
    ↓
Mounts files into container at specified path
    ↓
Container reads files
```

**ConfigMap Update Flow:**

```
User updates ConfigMap
    ↓
API Server stores new version in etcd
    ↓
For volume mounts:
    Kubelet detects change (periodic sync)
    ↓
    Updates mounted files (eventually consistent)
    ↓
    Application reads new data (if watching files)

For environment variables:
    No automatic update
    ↓
    Pod must be restarted to get new values
```

**Data Types in ConfigMap:**

1. **Simple Key-Value**: `key: value`
2. **Multi-line Values**: Use `|` or `>` for YAML multi-line strings
3. **Binary Data**: Use base64 encoding (better to use Secrets)
4. **File Data**: Entire file contents as value

**Components Involved:**

- **API Server**: Stores and serves ConfigMap data
- **etcd**: Persists ConfigMap data
- **Kubelet**: Retrieves ConfigMap and injects into Pods
- **Container Runtime**: Sets environment variables or mounts files

### YAML Definition (MANDATORY)

**ConfigMap with Different Data Types:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
  labels:
    app: myapp
data:
  # Simple key-value pairs
  database_host: "mysql.default.svc.cluster.local"
  database_port: "3306"
  log_level: "info"
  feature_flag_new_ui: "true"
  
  # Multi-line configuration (literal style)
  nginx.conf: |
    server {
        listen 80;
        server_name example.com;
        
        location / {
            proxy_pass http://backend:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
  
  # Multi-line configuration (folded style)
  app-config.yaml: >
    app:
      name: myapp
      version: 1.0.0
    database:
      host: mysql.default.svc.cluster.local
      port: 3306
    logging:
      level: info
      format: json
  
  # JSON configuration
  config.json: |
    {
      "server": {
        "port": 8080,
        "host": "0.0.0.0"
      },
      "database": {
        "host": "mysql",
        "port": 3306
      }
    }
  
  # Properties file
  application.properties: |
    server.port=8080
    spring.datasource.url=jdbc:mysql://mysql:3306/mydb
    spring.datasource.username=user
    spring.jpa.hibernate.ddl-auto=update

# Binary data (use for small binary files, prefer Secrets for sensitive data)
binaryData:
  image.png: <base64-encoded-data>
```

**Pod Consuming ConfigMap as Environment Variables:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-env-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    # Method 1: Import all keys as environment variables
    envFrom:
    - configMapRef:
        name: app-config
    # Creates env vars: database_host, database_port, log_level, etc.
    
    # Method 2: Import specific keys with custom names
    env:
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    - name: DB_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_port
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log_level
          optional: true  # Don't fail if key doesn't exist
```

**Pod Consuming ConfigMap as Volume:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-volume-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    volumeMounts:
    # Mount entire ConfigMap
    - name: config-volume
      mountPath: /etc/config
      readOnly: true
    # Creates files: /etc/config/nginx.conf, /etc/config/app-config.yaml, etc.
    
    # Mount specific keys
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
      readOnly: true
    # Creates single file: /etc/nginx/nginx.conf
  
  volumes:
  # Mount entire ConfigMap
  - name: config-volume
    configMap:
      name: app-config
      defaultMode: 0644  # File permissions
  
  # Mount specific keys
  - name: nginx-config
    configMap:
      name: app-config
      items:
      - key: nginx.conf
        path: nginx.conf
        mode: 0644
```

**ConfigMap with Immutable Flag:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: immutable-config
immutable: true  # Cannot be updated after creation
data:
  app_version: "1.0.0"
  release_date: "2024-01-15"
```

**Field Explanations:**

- **data**: Key-value pairs (values must be strings)
- **binaryData**: Binary data encoded in base64
- **immutable**: If true, ConfigMap cannot be updated (improves performance)
- **envFrom**: Import all ConfigMap keys as environment variables
- **env.valueFrom.configMapKeyRef**: Import specific ConfigMap key as environment variable
- **volumes.configMap**: Mount ConfigMap as volume
- **items**: Select specific keys to mount
- **subPath**: Mount single file instead of directory
- **defaultMode**: File permissions (octal)

### kubectl Commands

**Creation:**

```bash
# Create from literal values
kubectl create configmap app-config \
  --from-literal=database_host=mysql \
  --from-literal=database_port=3306 \
  --from-literal=log_level=info

# Create from file (file name becomes key)
kubectl create configmap nginx-config --from-file=nginx.conf

# Create from file with custom key
kubectl create configmap nginx-config --from-file=config=nginx.conf

# Create from directory (each file becomes a key)
kubectl create configmap app-config --from-file=./config-dir/

# Create from env file
kubectl create configmap app-config --from-env-file=app.env

# Create from YAML
kubectl apply -f configmap.yaml

# Dry run to see YAML
kubectl create configmap app-config --from-literal=key=value --dry-run=client -o yaml
```

**Verification:**

```bash
# List ConfigMaps
kubectl get configmaps
kubectl get cm  # Short form

# Get ConfigMap details
kubectl describe configmap app-config

# Get ConfigMap data
kubectl get configmap app-config -o yaml

# Get specific key value
kubectl get configmap app-config -o jsonpath='{.data.database_host}'

# Get all keys
kubectl get configmap app-config -o jsonpath='{.data}' | jq 'keys'

# Check ConfigMap size
kubectl get configmap app-config -o jsonpath='{.data}' | wc -c
```

**Updates:**

```bash
# Edit ConfigMap interactively
kubectl edit configmap app-config

# Update from file
kubectl create configmap app-config --from-file=nginx.conf --dry-run=client -o yaml | kubectl apply -f -

# Patch specific key
kubectl patch configmap app-config -p '{"data":{"log_level":"debug"}}'

# Replace entire ConfigMap
kubectl replace -f configmap.yaml

# Delete and recreate (for immutable ConfigMaps)
kubectl delete configmap app-config
kubectl create configmap app-config --from-literal=key=value
```

**Usage Verification:**

```bash
# Check which Pods use ConfigMap
kubectl get pods -o json | jq '.items[] | select(.spec.volumes[]?.configMap.name=="app-config") | .metadata.name'

# Check environment variables in Pod
kubectl exec <pod-name> -- env | grep -i database

# Check mounted files in Pod
kubectl exec <pod-name> -- ls -la /etc/config
kubectl exec <pod-name> -- cat /etc/config/nginx.conf

# Verify ConfigMap is mounted
kubectl describe pod <pod-name> | grep -A 5 "Mounts"
```

**Debugging:**

```bash
# Check if ConfigMap exists
kubectl get configmap app-config

# Check ConfigMap in specific namespace
kubectl get configmap app-config -n production

# Verify ConfigMap data
kubectl get configmap app-config -o yaml

# Check Pod events for ConfigMap errors
kubectl describe pod <pod-name> | grep -i configmap

# Test ConfigMap mounting
kubectl run test-pod --image=busybox --rm -it -- sh
# Inside pod:
ls /etc/config
cat /etc/config/nginx.conf
```

**Cleanup:**

```bash
# Delete ConfigMap
kubectl delete configmap app-config

# Delete from file
kubectl delete -f configmap.yaml

# Delete all ConfigMaps with label
kubectl delete configmaps -l app=myapp

# Force delete
kubectl delete configmap app-config --force --grace-period=0
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Size Limit Exceeded**
   - ConfigMap larger than 1 MiB
   - Result: API validation error

2. **Referencing Non-Existent ConfigMap**
   - Pod references ConfigMap that doesn't exist
   - Result: Pod stuck in ContainerCreating

3. **Expecting Automatic Updates**
   - Assuming environment variables update when ConfigMap changes
   - Result: Stale configuration in running Pods

4. **Wrong Namespace**
   - ConfigMap in different namespace than Pod
   - Result: ConfigMap not found error

5. **Immutable ConfigMap Updates**
   - Trying to update immutable ConfigMap
   - Result: Immutable field error

**Troubleshooting Guide:**

**Issue: Pod stuck in ContainerCreating**

```bash
# Check Pod events
kubectl describe pod <pod-name>

# Common causes:

# 1. ConfigMap doesn't exist
kubectl get configmap <configmap-name>
# Solution: Create ConfigMap

# 2. Wrong namespace
kubectl get configmap <configmap-name> -n <namespace>
# Solution: Create ConfigMap in correct namespace or update Pod

# 3. Wrong key name
kubectl get configmap <configmap-name> -o yaml
# Solution: Fix key name in Pod spec

# 4. Optional key not marked as optional
# Solution: Add optional: true to configMapKeyRef
```

**Issue: Environment variables not updating**

```bash
# Environment variables are set at container start
# They don't update when ConfigMap changes

# Solution 1: Restart Pods
kubectl rollout restart deployment/<deployment-name>

# Solution 2: Use volume mounts instead
# Volumes update automatically (with delay)

# Solution 3: Use configuration reload in application
# Application watches mounted files and reloads on change
```

**Issue: Mounted files not updating**

```bash
# Check if ConfigMap is immutable
kubectl get configmap <configmap-name> -o jsonpath='{.immutable}'

# If immutable, must delete and recreate
kubectl delete configmap <configmap-name>
kubectl create configmap <configmap-name> --from-file=config.yaml

# If not immutable, wait for sync (can take up to 1 minute)
# Or restart Pod
kubectl delete pod <pod-name>

# Check if subPath is used
kubectl get pod <pod-name> -o yaml | grep subPath
# subPath mounts don't update automatically
# Solution: Don't use subPath or restart Pod
```

**Issue: ConfigMap too large**

```bash
# Check ConfigMap size
kubectl get configmap <configmap-name> -o yaml | wc -c

# If > 1 MiB, solutions:

# 1. Split into multiple ConfigMaps
kubectl create configmap app-config-1 --from-file=config1.yaml
kubectl create configmap app-config-2 --from-file=config2.yaml

# 2. Store large files externally (S3, NFS)
# Mount as volume or download at startup

# 3. Use init container to fetch configuration
# Init container downloads config before main container starts
```

**Issue: Permission denied reading mounted files**

```bash
# Check file permissions
kubectl exec <pod-name> -- ls -la /etc/config

# Check defaultMode in ConfigMap volume
kubectl get pod <pod-name> -o yaml | grep -A 5 "defaultMode"

# Solution: Set correct permissions
# In Pod spec:
volumes:
- name: config
  configMap:
    name: app-config
    defaultMode: 0644  # or 0444 for read-only
```

**Issue: Binary data corruption**

```bash
# Don't use data field for binary data
# Use binaryData field instead

# Incorrect:
data:
  image.png: <binary-data>  # Will be corrupted

# Correct:
binaryData:
  image.png: <base64-encoded-data>

# Encode file to base64
base64 -w 0 image.png > image.png.b64

# Create ConfigMap
kubectl create configmap images --from-file=image.png=image.png.b64
```

### Interview Notes

**Q1: What is the difference between ConfigMaps and Secrets?**

A:
- **ConfigMaps**: Store non-confidential configuration data. Data stored as plain text in etcd. Suitable for application settings, configuration files, environment-specific parameters.
- **Secrets**: Store sensitive data (passwords, tokens, keys). Data base64-encoded (not encrypted by default). Can be encrypted at rest with additional configuration. Suitable for credentials, certificates, API keys.

Both have similar usage patterns (environment variables, volume mounts) but Secrets have additional security features and restrictions.

**Q2: Do environment variables from ConfigMaps update automatically when the ConfigMap changes?**

A: No. Environment variables are set when the container starts and remain static throughout the container's lifetime. If you update a ConfigMap, existing Pods will continue using the old values. To get new values, you must restart the Pods (e.g., `kubectl rollout restart deployment/<name>`).

In contrast, ConfigMaps mounted as volumes do update automatically (with a delay of up to 1 minute), but only if you don't use `subPath`. Applications must watch for file changes and reload configuration.

**Q3: What is the maximum size of a ConfigMap and why?**

A: The maximum size of a ConfigMap is 1 MiB (1,048,576 bytes). This limit exists because:
1. ConfigMaps are stored in etcd, which has size limits for individual objects
2. Large ConfigMaps can impact API Server and etcd performance
3. ConfigMaps are loaded entirely into memory by kubelet
4. Large ConfigMaps slow down Pod startup

For larger configuration data, consider:
- Splitting into multiple ConfigMaps
- Storing in external systems (S3, NFS, databases)
- Using init containers to fetch configuration at startup

**Q4: What is the purpose of the immutable field in ConfigMaps?**

A: The `immutable: true` field makes a ConfigMap read-only after creation. Benefits include:
1. **Protection**: Prevents accidental updates to critical configuration
2. **Performance**: API Server doesn't need to watch for changes, reducing load
3. **Reliability**: Guarantees configuration consistency across Pod restarts
4. **Rollback Safety**: Forces explicit recreation for changes, preventing gradual drift

Once set to immutable, the ConfigMap cannot be updated—you must delete and recreate it. This is useful for versioned configuration that should never change (e.g., release-specific settings).

---

## 9. Secrets

![Secrets Flow](https://mgx-backend-cdn.metadl.com/generate/images/924069/2026-01-21/0c213ffc-98a8-4711-961d-959b8429e694.png)

### Concept Explanation (IN DETAIL)

**What is a Secret?**

A Secret is a Kubernetes object used to store and manage sensitive information such as passwords, OAuth tokens, SSH keys, and TLS certificates. Secrets are similar to ConfigMaps but are specifically intended for confidential data. Kubernetes provides additional protections for Secrets, including base64 encoding, optional encryption at rest, and restricted access through RBAC.

**Why does it exist?**

Secrets exist to provide a secure way to manage sensitive data in Kubernetes. Without Secrets, you would need to:
1. Hardcode credentials in container images (major security risk)
2. Pass sensitive data as plain text environment variables (visible in Pod specs)
3. Store credentials in ConfigMaps (no security differentiation)
4. Use external secret management systems (adds complexity)

Secrets provide a native, Kubernetes-integrated way to handle sensitive data with appropriate security controls.

**What problems does it solve?**

Secrets solve several critical security problems:

1. **Credential Management**: Centralized storage for sensitive data
2. **Access Control**: RBAC integration for fine-grained permissions
3. **Encryption**: Optional encryption at rest in etcd
4. **Separation of Concerns**: Separate sensitive data from application code
5. **Rotation**: Update credentials without rebuilding images
6. **Audit**: Track access and changes through Kubernetes API
7. **Namespace Isolation**: Secrets scoped to namespaces for multi-tenancy

**How it works internally?**

Secrets store data as base64-encoded strings in etcd. When a Pod references a Secret:

1. **Storage**: Secret data base64-encoded and stored in etcd
2. **Encryption**: Optionally encrypted at rest (requires configuration)
3. **Reference**: Pod spec references Secret by name
4. **Injection**: Kubelet retrieves Secret from API Server
5. **Decoding**: Base64-decoded before injection into Pod
6. **Mounting**: Data injected as environment variables or mounted as files
7. **Memory**: Secrets mounted as tmpfs (in-memory filesystem) for security

**Important Security Notes:**
- Base64 encoding is NOT encryption (easily decoded)
- Secrets are stored in plain text in etcd by default
- Enable encryption at rest for production clusters
- Use RBAC to restrict Secret access
- Consider external secret management (Vault, AWS Secrets Manager) for enhanced security

### Architecture / Internal Working

**Secret Types:**

Kubernetes supports several Secret types for different use cases:

1. **Opaque** (default): Arbitrary user-defined data
2. **kubernetes.io/service-account-token**: Service account token
3. **kubernetes.io/dockercfg**: Docker registry credentials (legacy)
4. **kubernetes.io/dockerconfigjson**: Docker registry credentials
5. **kubernetes.io/basic-auth**: Basic authentication credentials
6. **kubernetes.io/ssh-auth**: SSH authentication credentials
7. **kubernetes.io/tls**: TLS certificate and key
8. **bootstrap.kubernetes.io/token**: Bootstrap token

**Secret Creation Flow:**

```
User creates Secret with sensitive data
    ↓
Data base64-encoded (if not already)
    ↓
API Server validates Secret
    ↓
Secret stored in etcd (encrypted if enabled)
    ↓
Available for Pod consumption
```

**Pod Consumption Flow:**

**As Environment Variables:**
```
Pod created with env referencing Secret
    ↓
Kubelet retrieves Secret from API Server
    ↓
Secret data base64-decoded
    ↓
Environment variables set in container
    ↓
Container starts with env vars
```

**As Volume Mounts:**
```
Pod created with volume referencing Secret
    ↓
Kubelet retrieves Secret from API Server
    ↓
Secret data base64-decoded
    ↓
Creates tmpfs (in-memory) filesystem
    ↓
Writes Secret data to tmpfs
    ↓
Mounts tmpfs into container at specified path
    ↓
Container reads files from tmpfs
```

**Encryption at Rest:**

```
Enable encryption provider in API Server config
    ↓
API Server encrypts Secret data before storing in etcd
    ↓
Secret stored encrypted in etcd
    ↓
API Server decrypts when retrieving Secret
    ↓
Kubelet receives decrypted Secret
```

**Components Involved:**

- **API Server**: Stores and serves Secret data, handles encryption/decryption
- **etcd**: Persists Secret data (encrypted or plain text)
- **Kubelet**: Retrieves Secrets and injects into Pods
- **RBAC**: Controls who can read/write Secrets
- **Encryption Provider**: Encrypts Secrets at rest (optional)

### YAML Definition (MANDATORY)

**Opaque Secret (Generic):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: default
  labels:
    app: myapp
type: Opaque
data:
  # Data must be base64-encoded
  database-password: cGFzc3dvcmQxMjM=  # "password123"
  api-key: YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=  # "abcdefghijklmnopqrstuvwxyz"
  
stringData:
  # stringData automatically base64-encodes values
  database-username: admin
  redis-password: redis123
  jwt-secret: my-super-secret-jwt-key
```

**Docker Registry Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: docker-registry-secret
  namespace: default
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJ1c2VyIiwicGFzc3dvcmQiOiJwYXNzIiwiYXV0aCI6ImRYTmxjanB3WVhOeiJ9fX0=
```

**TLS Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...  # Base64-encoded certificate
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ==  # Base64-encoded private key
```

**Basic Auth Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: basic-auth-secret
  namespace: default
type: kubernetes.io/basic-auth
stringData:
  username: admin
  password: secretpassword
```

**SSH Auth Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ssh-auth-secret
  namespace: default
type: kubernetes.io/ssh-auth
data:
  ssh-privatekey: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ==  # Base64-encoded SSH private key
```

**Pod Consuming Secret as Environment Variables:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-env-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    # Method 1: Import all keys as environment variables
    envFrom:
    - secretRef:
        name: app-secrets
    # Creates env vars: database-password, api-key, etc.
    
    # Method 2: Import specific keys with custom names
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-password
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: api-key
          optional: true  # Don't fail if key doesn't exist
```

**Pod Consuming Secret as Volume:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secret-volume-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    volumeMounts:
    # Mount entire Secret
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
    # Creates files: /etc/secrets/database-password, /etc/secrets/api-key
    
    # Mount specific keys
    - name: db-password
      mountPath: /etc/db-password
      subPath: database-password
      readOnly: true
  
  volumes:
  # Mount entire Secret
  - name: secret-volume
    secret:
      secretName: app-secrets
      defaultMode: 0400  # Read-only for owner
  
  # Mount specific keys
  - name: db-password
    secret:
      secretName: app-secrets
      items:
      - key: database-password
        path: password
        mode: 0400
```

**Pod with imagePullSecrets:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-image-pod
spec:
  containers:
  - name: app
    image: private-registry.example.com/myapp:1.0
  
  # Reference Docker registry Secret
  imagePullSecrets:
  - name: docker-registry-secret
```

**Immutable Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: immutable-secret
type: Opaque
immutable: true  # Cannot be updated after creation
stringData:
  api-key: production-api-key-12345
  encryption-key: super-secret-encryption-key
```

**Field Explanations:**

- **type**: Secret type (Opaque, kubernetes.io/tls, etc.)
- **data**: Base64-encoded key-value pairs
- **stringData**: Plain text key-value pairs (automatically base64-encoded)
- **immutable**: If true, Secret cannot be updated
- **defaultMode**: File permissions for mounted Secret files (octal)
- **items**: Select specific keys to mount
- **optional**: Don't fail if Secret or key doesn't exist

### kubectl Commands

**Creation:**

```bash
# Create from literal values
kubectl create secret generic app-secrets \
  --from-literal=database-password=password123 \
  --from-literal=api-key=abc123xyz

# Create from file (file name becomes key)
kubectl create secret generic app-secrets --from-file=ssh-privatekey=~/.ssh/id_rsa

# Create from file with custom key
kubectl create secret generic app-secrets --from-file=key=./secret-file.txt

# Create from directory
kubectl create secret generic app-secrets --from-file=./secrets-dir/

# Create Docker registry Secret
kubectl create secret docker-registry docker-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=user \
  --docker-password=password \
  --docker-email=user@example.com

# Create TLS Secret
kubectl create secret tls tls-secret \
  --cert=path/to/cert.crt \
  --key=path/to/key.key

# Create from YAML
kubectl apply -f secret.yaml

# Dry run
kubectl create secret generic app-secrets --from-literal=key=value --dry-run=client -o yaml
```

**Verification:**

```bash
# List Secrets
kubectl get secrets

# Get Secret details (data hidden)
kubectl describe secret app-secrets

# Get Secret data (base64-encoded)
kubectl get secret app-secrets -o yaml

# Decode Secret data
kubectl get secret app-secrets -o jsonpath='{.data.database-password}' | base64 --decode

# Get all keys
kubectl get secret app-secrets -o jsonpath='{.data}' | jq 'keys'

# Check Secret type
kubectl get secret app-secrets -o jsonpath='{.type}'

# Check if Secret is immutable
kubectl get secret app-secrets -o jsonpath='{.immutable}'
```

**Updates:**

```bash
# Edit Secret interactively
kubectl edit secret app-secrets

# Update from file
kubectl create secret generic app-secrets --from-file=key=./new-secret.txt --dry-run=client -o yaml | kubectl apply -f -

# Patch specific key (base64-encoded)
kubectl patch secret app-secrets -p '{"data":{"api-key":"bmV3LWFwaS1rZXk="}}'

# Replace entire Secret
kubectl replace -f secret.yaml

# Delete and recreate (for immutable Secrets)
kubectl delete secret app-secrets
kubectl create secret generic app-secrets --from-literal=key=value
```

**Usage Verification:**

```bash
# Check which Pods use Secret
kubectl get pods -o json | jq '.items[] | select(.spec.volumes[]?.secret.secretName=="app-secrets") | .metadata.name'

# Check environment variables in Pod
kubectl exec <pod-name> -- env | grep -i password

# Check mounted files in Pod
kubectl exec <pod-name> -- ls -la /etc/secrets
kubectl exec <pod-name> -- cat /etc/secrets/database-password

# Verify Secret is mounted as tmpfs
kubectl exec <pod-name> -- mount | grep secrets
```

**Security Operations:**

```bash
# Check who can read Secrets
kubectl auth can-i get secrets --as=user@example.com

# Check who can create Secrets
kubectl auth can-i create secrets --as=user@example.com

# List all Secrets in cluster (requires cluster-admin)
kubectl get secrets --all-namespaces

# Audit Secret access (requires audit logging)
kubectl logs -n kube-system kube-apiserver-* | grep "secrets"

# Rotate Secret
kubectl create secret generic app-secrets-v2 --from-literal=key=new-value
kubectl set env deployment/myapp --from=secret/app-secrets-v2
kubectl delete secret app-secrets
```

**Cleanup:**

```bash
# Delete Secret
kubectl delete secret app-secrets

# Delete from file
kubectl delete -f secret.yaml

# Delete all Secrets with label
kubectl delete secrets -l app=myapp

# Force delete
kubectl delete secret app-secrets --force --grace-period=0
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Storing Secrets in Version Control**
   - Committing Secret YAML files to Git
   - Result: Credentials exposed in repository history

2. **Not Using Encryption at Rest**
   - Secrets stored in plain text in etcd
   - Result: Credentials readable if etcd is compromised

3. **Overly Permissive RBAC**
   - Granting broad Secret access
   - Result: Unauthorized access to sensitive data

4. **Using Environment Variables for Secrets**
   - Env vars visible in Pod spec, logs, crash dumps
   - Result: Accidental credential exposure

5. **Not Rotating Secrets**
   - Using same credentials indefinitely
   - Result: Increased risk if credentials are compromised

**Troubleshooting Guide:**

**Issue: Pod stuck in ContainerCreating**

```bash
# Check Pod events
kubectl describe pod <pod-name>

# Common causes:

# 1. Secret doesn't exist
kubectl get secret <secret-name>
# Solution: Create Secret

# 2. Wrong namespace
kubectl get secret <secret-name> -n <namespace>
# Solution: Create Secret in correct namespace

# 3. Wrong key name
kubectl get secret <secret-name> -o yaml
# Solution: Fix key name in Pod spec

# 4. Insufficient permissions
kubectl auth can-i get secrets/<secret-name>
# Solution: Grant RBAC permissions
```

**Issue: Cannot decode Secret data**

```bash
# Get base64-encoded data
kubectl get secret <secret-name> -o jsonpath='{.data.key}'

# Decode
echo "base64-string" | base64 --decode

# If decoding fails, check encoding
# Ensure data was properly base64-encoded when created

# Use stringData for automatic encoding
kubectl create secret generic test --from-literal=key=value -o yaml
```

**Issue: Secret updates not reflected in Pod**

```bash
# Environment variables don't update automatically
# Solution: Restart Pod
kubectl delete pod <pod-name>

# For Deployments, trigger rollout
kubectl rollout restart deployment/<deployment-name>

# Volume mounts update automatically (with delay)
# Check if update propagated
kubectl exec <pod-name> -- cat /etc/secrets/key

# If using subPath, updates don't propagate
# Solution: Don't use subPath or restart Pod
```

**Issue: Permission denied reading Secret files**

```bash
# Check file permissions
kubectl exec <pod-name> -- ls -la /etc/secrets

# Check defaultMode in Secret volume
kubectl get pod <pod-name> -o yaml | grep -A 5 "defaultMode"

# Solution: Set correct permissions
volumes:
- name: secrets
  secret:
    secretName: app-secrets
    defaultMode: 0400  # Read-only for owner
```

**Issue: Secret too large**

```bash
# Check Secret size
kubectl get secret <secret-name> -o yaml | wc -c

# Maximum size: 1 MiB
# If too large, solutions:

# 1. Split into multiple Secrets
# 2. Store large secrets externally (Vault, AWS Secrets Manager)
# 3. Use init container to fetch secrets at startup
```

**Issue: Secrets visible in Pod spec**

```bash
# Don't use environment variables for highly sensitive data
# They're visible in:
kubectl get pod <pod-name> -o yaml  # Pod spec
kubectl describe pod <pod-name>     # Pod description

# Solution: Use volume mounts instead
# Secrets mounted as volumes are not visible in Pod spec
```

**Issue: Encryption at rest not working**

```bash
# Check if encryption is enabled
kubectl get --raw /api/v1/namespaces/kube-system/secrets/encryption-config -o yaml

# Enable encryption at rest:
# 1. Create encryption configuration
# 2. Update API Server flags
# 3. Restart API Server
# 4. Encrypt existing Secrets

# Verify encryption
# Create test Secret
kubectl create secret generic test --from-literal=key=value

# Check in etcd (requires etcd access)
ETCDCTL_API=3 etcdctl get /registry/secrets/default/test
# Should see encrypted data, not plain text
```

### Interview Notes

**Q1: How are Secrets different from ConfigMaps?**

A:
- **Purpose**: Secrets for sensitive data, ConfigMaps for non-sensitive configuration
- **Encoding**: Secrets base64-encoded, ConfigMaps plain text
- **Storage**: Secrets can be encrypted at rest, ConfigMaps always plain text
- **Mounting**: Secrets mounted as tmpfs (in-memory), ConfigMaps as regular files
- **RBAC**: Secrets typically have stricter access controls
- **Visibility**: Secrets hidden in `kubectl describe`, ConfigMaps shown

Both have similar usage patterns (env vars, volumes) but Secrets have additional security features.

**Q2: Is base64 encoding of Secrets secure?**

A: No. Base64 encoding is NOT encryption—it's easily reversible. Secrets are base64-encoded for:
1. Handling binary data (certificates, keys)
2. Avoiding special character issues in YAML
3. Consistent data format

For security, you must:
- Enable encryption at rest in etcd
- Use RBAC to restrict Secret access
- Consider external secret management (Vault, AWS Secrets Manager)
- Avoid committing Secrets to version control

**Q3: What happens when you update a Secret that's being used by a running Pod?**

A:
- **Environment Variables**: Do NOT update. The Pod must be restarted to get new values.
- **Volume Mounts**: Update automatically after a delay (up to 1 minute), but only if you don't use `subPath`. The application must watch for file changes and reload.
- **imagePullSecrets**: Only used during Pod creation, updates don't affect running Pods.

For critical updates, it's best to trigger a rolling restart of Pods to ensure consistency.

**Q4: What is the purpose of encryption at rest for Secrets?**

A: Encryption at rest protects Secrets stored in etcd. Without it, Secrets are stored in plain text (only base64-encoded), meaning anyone with etcd access can read them. Encryption at rest:
1. Encrypts Secret data before writing to etcd
2. Decrypts when API Server retrieves Secrets
3. Protects against etcd backups being compromised
4. Meets compliance requirements (PCI-DSS, HIPAA, etc.)

Enable it by configuring an encryption provider (aescbc, aesgcm, secretbox) in the API Server configuration and restarting the API Server.

# Kubernetes Complete Deep Dive Guide - Part 2
**Topics 10-22: Advanced Kubernetes Concepts**

---

## 10. Deployment + Service (End-to-End Flow)

[IMAGE: Deployment + Service end-to-end architecture diagram showing user request flow through Service to Pods managed by Deployment]

### Concept Explanation (IN DETAIL)

**What is Deployment + Service Integration?**

The combination of Deployment and Service is the most common pattern for running stateless applications in Kubernetes. A Deployment manages the lifecycle of Pods (creation, scaling, updates, rollbacks), while a Service provides stable networking and load balancing to access those Pods. Together, they form a complete solution for running and exposing applications.

**Why does this integration exist?**

This pattern exists because Pods are ephemeral and have dynamic IP addresses. When a Pod is recreated (due to failure, scaling, or updates), it gets a new IP address. Applications and users need a stable way to communicate with your application regardless of Pod changes. The Deployment ensures your application is always running with the desired number of replicas, while the Service provides a stable endpoint (ClusterIP, NodePort, or LoadBalancer) that automatically routes traffic to healthy Pods.

**What problem does it solve?**

This integration solves several critical problems:

1. **High Availability**: Deployment maintains multiple Pod replicas; if one fails, others continue serving traffic
2. **Load Balancing**: Service distributes traffic across all healthy Pod replicas
3. **Service Discovery**: Service provides a stable DNS name and IP for accessing the application
4. **Zero-Downtime Updates**: Deployment performs rolling updates while Service continues routing to healthy Pods
5. **Automatic Healing**: Deployment recreates failed Pods; Service automatically updates endpoints
6. **Decoupling**: Consumers don't need to know about individual Pods, only the Service

**How it works internally?**

The integration works through label selectors:

1. **Deployment** creates Pods with specific labels (e.g., `app=nginx, version=v1`)
2. **Service** uses a selector to identify Pods (e.g., `selector: {app: nginx}`)
3. **Endpoints Controller** watches both Service and Pods, maintaining an Endpoints object with IPs of matching Pods
4. **kube-proxy** programs network rules (iptables/IPVS) to route Service traffic to Pod IPs
5. When Deployment scales or updates Pods, Endpoints automatically updates, and kube-proxy adjusts routing rules

### Architecture / Internal Working

**Complete Request Flow:**

```
User/Client
    ↓
DNS Resolution (service-name.namespace.svc.cluster.local → ClusterIP)
    ↓
Request to Service ClusterIP:Port
    ↓
kube-proxy intercepts (iptables/IPVS rules)
    ↓
DNAT to Pod IP:TargetPort (load balanced)
    ↓
Pod receives request
    ↓
Application processes request
    ↓
Response returns to client
```

**Component Interactions:**

1. **Deployment Controller**:
   - Watches Deployment objects
   - Creates/updates ReplicaSets
   - Manages rolling updates and rollbacks

2. **ReplicaSet Controller**:
   - Ensures desired number of Pods are running
   - Creates/deletes Pods as needed

3. **Endpoints Controller**:
   - Watches Services and Pods
   - Maintains Endpoints object with Pod IPs matching Service selector
   - Updates Endpoints when Pods are added/removed/become ready

4. **kube-proxy**:
   - Watches Services and Endpoints
   - Programs iptables/IPVS rules for traffic routing
   - Performs load balancing across Pod IPs

5. **CoreDNS**:
   - Provides DNS resolution for Service names
   - Returns Service ClusterIP for DNS queries

**Lifecycle Flow:**

```
1. User creates Deployment
   ↓
2. Deployment Controller creates ReplicaSet
   ↓
3. ReplicaSet Controller creates Pods with labels
   ↓
4. Scheduler assigns Pods to nodes
   ↓
5. Kubelet starts containers
   ↓
6. User creates Service with selector matching Pod labels
   ↓
7. Endpoints Controller finds matching Pods
   ↓
8. Endpoints object created with Pod IPs
   ↓
9. kube-proxy programs routing rules
   ↓
10. CoreDNS registers Service name
   ↓
11. Service is ready to receive traffic
```

**Update Flow (Rolling Update):**

```
1. User updates Deployment (new image version)
   ↓
2. Deployment Controller creates new ReplicaSet
   ↓
3. New ReplicaSet creates new Pods (with same labels)
   ↓
4. New Pods start and pass readiness probes
   ↓
5. Endpoints Controller adds new Pod IPs to Endpoints
   ↓
6. kube-proxy updates routing rules (traffic goes to old + new Pods)
   ↓
7. Old ReplicaSet scales down (deletes old Pods)
   ↓
8. Endpoints Controller removes old Pod IPs
   ↓
9. kube-proxy updates routing rules (traffic only to new Pods)
   ↓
10. Update complete, Service seamlessly transitioned to new version
```

### YAML Definition (MANDATORY)

**Complete Example: Deployment + Service**

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
  labels:
    app: nginx
    tier: frontend
spec:
  replicas: 3
  
  # Selector must match Pod template labels
  selector:
    matchLabels:
      app: nginx
      tier: frontend
  
  # Rolling update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  template:
    metadata:
      labels:
        app: nginx
        tier: frontend
        version: v1
    spec:
      containers:
      - name: nginx
        image: nginx:1.21.6
        ports:
        - containerPort: 80
          name: http
        
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        
        # Readiness probe - critical for zero-downtime updates
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        
        # Liveness probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 10

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: default
  labels:
    app: nginx
spec:
  type: ClusterIP  # or NodePort, LoadBalancer
  
  # Selector matches Deployment Pod labels
  selector:
    app: nginx
    tier: frontend
  
  ports:
  - name: http
    protocol: TCP
    port: 80          # Service port
    targetPort: 80    # Pod port (matches containerPort)
  
  # Session affinity (optional)
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

**Field Explanations:**

- **Deployment.spec.selector**: Must match Pod template labels exactly
- **Deployment.spec.replicas**: Number of Pod replicas to maintain
- **Deployment.spec.strategy**: How to perform updates (RollingUpdate or Recreate)
- **template.metadata.labels**: Labels applied to Pods (must include selector labels)
- **readinessProbe**: Determines when Pod is ready to receive traffic (critical for Service integration)
- **Service.spec.selector**: Matches Pods by labels (should match Deployment selector)
- **Service.spec.ports.port**: Port exposed by the Service
- **Service.spec.ports.targetPort**: Port on the Pod where traffic is sent

### kubectl Commands

**Creation:**

```bash
# Create Deployment
kubectl apply -f deployment.yaml

# Create Service
kubectl apply -f service.yaml

# Create both from single file
kubectl apply -f deployment-service.yaml

# Create Deployment imperatively
kubectl create deployment nginx --image=nginx:1.21.6 --replicas=3 --port=80

# Expose Deployment as Service
kubectl expose deployment nginx --port=80 --target-port=80 --name=nginx-service --type=ClusterIP
```

**Verification:**

```bash
# Check Deployment status
kubectl get deployment nginx-deployment
kubectl describe deployment nginx-deployment

# Check Pods created by Deployment
kubectl get pods -l app=nginx
kubectl get pods -l app=nginx -o wide

# Check Service
kubectl get service nginx-service
kubectl describe service nginx-service

# Check Service endpoints (should list Pod IPs)
kubectl get endpoints nginx-service
kubectl describe endpoints nginx-service

# Verify label matching
kubectl get deployment nginx-deployment -o jsonpath='{.spec.selector}'
kubectl get service nginx-service -o jsonpath='{.spec.selector}'
kubectl get pods -l app=nginx --show-labels

# Test Service connectivity
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://nginx-service
```

**Debugging:**

```bash
# Check if Service has endpoints
kubectl get endpoints nginx-service

# If no endpoints, check:
# 1. Pod labels match Service selector
kubectl get service nginx-service -o yaml | grep -A 5 selector
kubectl get pods -l app=nginx -o yaml | grep -A 5 labels

# 2. Pods are running and ready
kubectl get pods -l app=nginx

# 3. Pods pass readiness probes
kubectl describe pod <pod-name> | grep -A 10 Readiness
```

### Common Mistakes & Troubleshooting

**Common Mistakes:**

1. **Selector Mismatch**
   - Service selector doesn't match Deployment Pod labels
   - Result: Service has no endpoints, traffic doesn't reach Pods

2. **Missing Readiness Probes**
   - Pods added to Service endpoints before they're ready
   - Result: Failed requests during rolling updates

3. **Port Configuration Errors**
   - Service targetPort doesn't match container containerPort
   - Result: Connection refused errors

**Troubleshooting Guide:**

**Issue: Service has no endpoints**

```bash
# Check endpoints
kubectl get endpoints nginx-service

# If empty, verify:
# 1. Pod labels match Service selector
kubectl get service nginx-service -o jsonpath='{.spec.selector}'
kubectl get pods -l app=nginx --show-labels

# 2. Pods are running and ready
kubectl get pods -l app=nginx

# Solution: Fix label mismatch or ensure Pods are ready
kubectl label pod <pod-name> app=nginx tier=frontend
```

### Interview Notes

**Q1: How does a Service know which Pods to route traffic to?**

**A:** Services use label selectors to identify Pods. The Endpoints controller continuously watches for Pods matching the Service's selector and maintains an Endpoints object with their IP addresses. kube-proxy then programs network rules (iptables/IPVS) to route traffic from the Service ClusterIP to these Pod IPs.

**Q2: What happens to Service traffic during a Deployment rolling update?**

**A:** During a rolling update, the Service seamlessly transitions traffic from old Pods to new Pods. New Pods are created and pass readiness probes before being added to endpoints. Traffic is distributed across both old and new Pods during the transition. Old Pods are terminated only after new Pods are ready, ensuring zero-downtime if `maxUnavailable=0` and readiness probes are properly configured.

**Q3: Why are readiness probes critical for the Deployment + Service pattern?**

**A:** Readiness probes determine when a Pod is ready to receive traffic. Without them, new Pods are added to Service endpoints immediately after starting, which can cause requests to fail if the application isn't ready. With readiness probes, Pods are only added to endpoints after passing the probe, ensuring true zero-downtime rolling updates.

**Q4: What's the difference between Deployment selector and Service selector?**

**A:** The Deployment selector identifies which Pods the Deployment manages (creates, updates, deletes) and must match the Pod template labels exactly. The Service selector identifies which Pods receive traffic from the Service. Best practice: Service selector should match Deployment selector to ensure traffic goes to Deployment-managed Pods.

---

# Kubernetes Core Concepts – Deep Dive Notes

> **Production-ready | Interview-oriented | Markdown-friendly**

---

## 12. Rolling Updates & Rollbacks

### Concept Explanation (IN DETAIL)

### What is a Rolling Update?

A **Rolling Update** is a deployment strategy where Pods are updated **gradually**, ensuring **zero downtime** by creating new Pods before terminating old ones.

### Why does it exist?

* Zero-downtime deployments
* Safe application upgrades
* Easy rollback during failures
* Enables CI/CD pipelines

### What problem does it solve?

* Prevents full outages during releases
* Avoids traffic drops
* Enables controlled version transitions

### How it works internally?

* Managed by the **Deployment Controller**
* Uses ReplicaSets
* Controlled via `maxSurge` and `maxUnavailable`
* Relies on Readiness Probes

### Step-by-Step Flow

1. Deployment image updated
2. New ReplicaSet created
3. New Pods started
4. Readiness probe passes
5. Old Pods terminated gradually
6. Traffic shifts fully to new Pods

### YAML Example

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1
```

### Rollbacks

```bash
kubectl rollout undo deployment my-app
kubectl rollout history deployment my-app
```

### Common Mistakes

* Missing readiness probes
* `maxUnavailable: 100%`
* Stateful apps without session handling

### Interview Notes

**Q:** How does Kubernetes ensure zero downtime?
**A:** Rolling updates + readiness probes + controlled Pod replacement.

---

## 13. Liveness & Readiness Probes

### What are Probes?

Health checks executed by kubelet to determine container health.

| Probe     | Purpose              |
| --------- | -------------------- |
| Liveness  | Restart container    |
| Readiness | Control traffic      |
| Startup   | Handle slow startups |

### Why do they exist?

* Detect crashed apps
* Prevent traffic to unhealthy Pods
* Enable zero-downtime deployments

### Internal Working

* kubelet executes probe
* Liveness failure → restart
* Readiness failure → remove from Service

### YAML Example

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
```

### Common Mistakes

* Same endpoint for both probes
* Aggressive timeouts
* Missing startupProbe

### Interview Notes

**Q:** Difference between liveness and readiness?
**A:** Liveness restarts containers; readiness controls traffic routing.

---

## 14. Namespaces

### What is a Namespace?

A **logical isolation boundary** inside a cluster.

### Why does it exist?

* Team isolation
* Resource quotas
* Environment separation

### What problem does it solve?

* Name collisions
* Access control complexity
* Resource contention

### Internal Working

* Enforced by API Server
* RBAC scoped per namespace
* Some resources are cluster-wide (Nodes, PVs)

### Commands

```bash
kubectl get ns
kubectl create ns dev
kubectl get pods -n dev
```

### Common Mistakes

* Overusing default namespace
* Forgetting `-n` flag
* Assuming network isolation

### Interview Notes

**Q:** Do namespaces isolate networking?
**A:** No, NetworkPolicies are required.

---

## 15. Resource Requests & Limits

### What are Requests & Limits?

| Type    | Purpose            |
| ------- | ------------------ |
| Request | Guaranteed minimum |
| Limit   | Maximum allowed    |

### Why do they exist?

* Prevent resource starvation
* Enable fair scheduling
* Avoid noisy neighbors

### Internal Working

* Scheduler uses requests
* kubelet enforces limits
* CPU throttled, memory OOMKilled

### YAML Example

```yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

### Common Mistakes

* No limits
* Too tight limits
* Ignoring QoS classes

### Interview Notes

**Q:** What happens when memory limit is exceeded?
**A:** Container is OOMKilled.

---

## 16. Volumes

### What is a Volume?

A directory accessible to containers in a Pod.

### Why does it exist?

* Containers are ephemeral
* Data persistence required
* Share data between containers

### Volume Types

* emptyDir
* hostPath
* configMap
* secret
* persistentVolumeClaim

### YAML Example

```yaml
volumes:
- name: data
  emptyDir: {}
```

---

## 17. Persistent Volumes (PV)

### What is a PV?

A **cluster-wide storage resource**.

### Why does it exist?

* Decouple storage from Pods
* Enable durable storage

### Internal Flow

Admin creates PV → User claims via PVC → Pod consumes

### YAML Example

```yaml
apiVersion: v1
kind: PersistentVolume
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce
```

---

## 18. Persistent Volume Claims (PVC)

### What is a PVC?

A request for storage by a user.

### Why does it exist?

* Abstract storage
* Enable dynamic provisioning

### Binding Flow

PVC → PV → Bound → Pod

### YAML Example

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

---

## 19. Ingress & Ingress Controller

### What is Ingress?

Manages external HTTP/HTTPS access to Services.

### Why does it exist?

* Centralized routing
* TLS termination
* Reduce LoadBalancers

### Internal Flow

Client → Ingress Controller → Service → Pod

### YAML Example

```yaml
rules:
- host: app.example.com
  http:
    paths:
    - path: /
      backend:
        service:
          name: app
          port:
            number: 80
```

### Interview Notes

**Q:** Is Ingress a load balancer?
**A:** No, it defines rules; controller does the work.

---

## 20. Horizontal Pod Autoscaler (HPA)

### What is HPA?

Automatically scales Pods based on metrics.

### Metrics Used

* CPU
* Memory
* Custom metrics

### YAML Example

```yaml
minReplicas: 2
maxReplicas: 10
targetCPUUtilizationPercentage: 70
```

### Internal Flow

Metrics Server → HPA Controller → Deployment scale

---

## 21. Kubernetes Cluster Architecture

### Core Components

**Control Plane**

* API Server
* Scheduler
* Controller Manager
* etcd

**Worker Node**

* kubelet
* kube-proxy
* Container Runtime

### Traffic Flow

kubectl → API Server → etcd
Scheduler → kubelet → container runtime

### Interview Notes

**Q:** Why is etcd critical?
**A:** It stores the entire cluster state.

---

## 22. Kubernetes Troubleshooting Guide

### Common Issues

| Issue               | Cause                  |
| ------------------- | ---------------------- |
| Pod Pending         | No resources           |
| CrashLoopBackOff    | App failure            |
| ImagePullBackOff    | Registry issue         |
| Service unreachable | kube-proxy / endpoints |

### Debug Flow

```bash
kubectl describe pod
kubectl logs
kubectl get events
kubectl exec -it pod -- sh
```

### Golden Rule

> Always debug in this order:
> **Pod → Container → Service → Network → Node**

---




